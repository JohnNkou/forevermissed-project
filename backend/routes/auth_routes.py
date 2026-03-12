from fastapi import APIRouter, HTTPException, Depends, status,Response,Cookie
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import User, UserCreate, UserLogin, UserResponse, Otp
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from utils import generate_session_id, generate_otp, set_session_cookie
from bson import ObjectId
from datetime import datetime
import os

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# This will be injected from server.py
db = None
OTP_EXPIRATION = int(os.environ['OTP_EXPIRATION'])


def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database

@router.post("/register")
async def register(user_data: UserCreate, response : Response):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if not existing_user:
        data = await db.otps.find_one({ "email": user_data.email })

        if data:
            session_id = generate_session_id()
            _response = await db.sessions.insert_one({ "sId": session_id, "email": user_data.email })

            if not _response.inserted_id:
                print("Couldn't insert session id",session_id);
                raise HTTPException(
                    status_code=500,
                    detail='An error occured'
                )

            set_session_cookie(session_id, response)

            return { "otp_required":True }

        otp_data = user_data.dict();
        otp = generate_otp()

        otp_data["code"] = otp
        otp_data["date_created"] = datetime.utcnow()
        otp_data["password"] = get_password_hash(user_data.password)

        client = db.client

        async with await client.start_session(causal_consistency=True) as session:
            async with session.start_transaction():
                _response = await db.otps.insert_one(otp_data)

                if _response.inserted_id:
                    session_id = generate_session_id()
                    _response = await db.sessions.insert_one({ "sId": session_id, "email": user_data.email })

                    if _response.inserted_id:
                        set_session_cookie(session_id, response)
                    else:
                        print("Was not able to insert the session_id %s for user %s" % (sessions, user_data))
                        raise HTTPException(500,"An error occured")
                else:
                    print("Was not able to insert otp %s in database for user %s" % (otp, user_data.email))
                    raise HTTPException(500,"An error occured")

        return { "otp_required":True }
    else:
        raise HTTPException(400,"Email already registered")

#Handling OTP
@router.post("/otp", status_code=201)
async def otp_verify(otp: Otp, sessionId: str = Cookie()):
    user_data = await db.sessions.find_one({ "sId": sessionId })

    if user_data:
        otp_data = await db.otps.find_one({ 
            "code": otp.code, 
            "email": user_data["email"],
            "$expr":{
                "$gte":[
                    OTP_EXPIRATION,
                    {
                        "$dateDiff":{
                            "startDate": "$date_created",
                            "endDate": datetime.utcnow(),
                            "unit": "second"
                        }
                    }
                ]
            }
        })

        if otp_data:
            response = await db.users.insert_one({
                "name": otp_data["name"],
                "email": otp_data["email"],
                "password": otp_data["password"],
                "role": otp_data["role"],
                "date_created": datetime.utcnow()
            })

            if response.inserted_id:
                access_token = create_access_token(
                    data={"email": otp_data["email"], "id": str(response.inserted_id), "role": otp_data["role"]}
                )

                return {
                    "access_token": access_token,
                    "token_type": "bearer",
                    "user":{
                        "id": str(response.inserted_id),
                        "name": otp_data["name"],
                        "email": otp_data["email"]
                    }
                }
            else:
                print("User was not inserted")
                raise HTTPException(
                    status_code=500,
                    detail="An error occured"
                )
        else:
            print("Otp not found with code",otp.code)
            raise HTTPException(
                status_code=404,
                detail='Otp expired'
            )
    else:
        print("Now session with this id exist",sessionId)
        raise HTTPException(
            status_code=404,
            detail='Otp expired'
        )

@router.post("/login")
async def login(user_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email})

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(user_data.password, user_doc["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={
            "name": user_doc['name'],
            "email": user_doc["email"],
            "id": str(user_doc["_id"]),
            "role": user_doc["role"]
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=str(user_doc["_id"]),
            email=user_doc["email"],
            name=user_doc["name"],
            role=user_doc["role"],
            profile_picture=user_doc.get("profile_picture"),
            date_created=user_doc["date_created"]
        )
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    abonnement = user_doc.get("abonnement", None)

    if abonnement:
        abonnement["id"] = str(abonnement["id"])
    
    return UserResponse(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        name=user_doc["name"],
        role=user_doc["role"],
        profile_picture=user_doc.get("profile_picture"),
        date_created=user_doc["date_created"],
        abonnement=abonnement,
        resources=user_doc.get('resources')
    )
