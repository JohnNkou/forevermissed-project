from fastapi import APIRouter, HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import User, UserModif, UserResponse, Card
from auth import get_current_admin, get_current_user, get_password_hash, get_current_manager
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/api/users", tags=["User Management"])

db = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database

@router.get("/")
async def list_users(current_user: dict = Depends(get_current_admin)):
    users = await db.users.find().sort("created_at", -1).to_list(1000)

    return {
        "users":    [
            { 
                "id": str(user["_id"]),
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
                "profile_picture": user.get("profile_picture"),
                "date_created": user["date_created"]
            }
            for user in users
        ] 
    } 

@router.post('/', status_code=201)
async def add_user(user: User, current_user : dict = Depends(get_current_admin)):
    if current_user['role'] == 'admin':
        user.role = 'admin'
        user.password = get_password_hash(user.password)
        
        response = await db.users.insert_one(user.model_dump())

        if response.inserted_id:
            return { "insertedId": str(response.inserted_id) }
        else:
            raise HTTPException(200,"User couldn't be inserted")
    else:
        raise HTTPException(401, "Admin is not authorized to add manager")

@router.put("/{user_id}", status_code=201)
async def update_user(
    user_id: str,
    user_data: UserModif,
    current_user: dict = Depends(get_current_admin)
):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )

    user = await db.users.find_one({ "_id": ObjectId(user_id) })

    if user:
        if user['role'] != 'manager' or user['role'] == 'manager' and  not user_data.email:
            # Don't allow changing password through this endpoint
            if "password" in user_data:
                user_data.password = get_password_hash(user_data.password)

            result = await db.users.update_one(
                {"_id": user['_id']},
                {"$set": user_data.model_dump(exclude_none=True)}
            )
            
            if result.modified_count:
                return {"message": "User updated successfully"}
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
        else:
            raise HTTPException(400,"Not allowed to change manager email")
    else:
        raise HTTPException(404, "User not found")

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(get_current_admin)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        _id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        role=user["role"],
        profile_picture=user.get("profile_picture"),
        created_at=user["created_at"]
    )

@router.delete("/{user_id}", status_code=201)
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_admin)
):
    if ObjectId.is_valid(user_id):
        user_id = ObjectId(user_id)
        # Don't allow deleting yourself
        if user_id != current_user["_id"]:
            manager = await db.users.find_one({ "_id": user_id })

            if manager:
                if manager['role'] != 'manager':
                    result = await db.users.delete_one({"_id": user_id})
                    
                    if result.deleted_count:
                        return {"message": "Admin deleted successfully"}
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="User not found"
                        )
                else:
                    manager_memorial_number = await db.memorials.count_documents({ "created_by": manager['_id'] })

                    if manager_memorial_number > 0:
                        client = db.client

                        async with await client.start_session(causal_consistency=True) as session:
                            response = await session.with_transaction(lambda session: delete_manager_and_resources(
                                session=session, memorial_length=manager_memorial_number,
                                manager_id=manager['_id']
                            ))

                        return { "message":"manager suspended" }
                    else:
                        response = await db.users.delete_one({ "_id": manager['_id'] })

                        if response.deleted_count:
                            return { "message":"Manager deleted" }
                        else:
                            return Response(status_code=200,detail="Coudln't delete the user")
            else:
                raise HTTPException(404,"To delete user not found")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )

async def delete_manager_and_resources(session,memorial_length, manager_id):
    response = await db.memorials.update_many(
        { "created_by": manager_id },
        { "$set": { "status": "suspended" } }
    )

    if response.modified_count == memorial_length:
        response = await db.users.update_one(
            { "_id": manager_id },
            { "$set": { "suspended": True } }
        )

        if response.modified_count:
            return True
        else:
            print("Manager should'nt be suspended")
            raise HTTPException(500, "Failed to suspend the manager")
    else:
        print("manager id type", type(manager_id))
        print("Number of modified memorial not equal to number of memorial_length. %s != %s" % (response.modified_count, memorial_length))
        raise HTTPException(500,"Failed to set the memorials status of to delete manager to suspended")

#Manager endpoint

@router.get("/{user_id}/cards", status_code=200)
async def get_cards(user = Depends(get_current_user)):
    user_id = user["_id"]

    response = await db.users.find_one({ "_id": user_id }, ["cards"])
    data = []

    users = await db.users.find().to_list(1000);

    if response:
        if response.get("cards"):
            ids = list(map(lambda x: x["id"], response["cards"]))
            data = await db.cards.find(
                { "_id": { "$in": ids } },
                {
                    "_id": { "$toString":"$_id" },
                    "number": 1, "expiration_date":1,
                    "name":1
                }
            ).to_list(10)

            for card in data:
                card["number"] = card["number"][-4:];

        return { "data": data }
    else:
        raise HTTPException(404,'User not found')

@router.put("/{user_id}/cards", status_code=201)
async def add_card(card: Card, manager: dict = Depends(get_current_manager)):
    if not await card.is_valid(db):
        raise HTTPException(
            status_code=400,
            detail="Invalid card"
        )

    manager_id = manager["_id"]
    payload = { "id": ObjectId(card.id) }

    response = await db.users.find_one({ "_id": manager_id, "cards": { "$exists":False }  }, { "_id":False, "name":True })

    if response:
        payload["default"] = True

    response = await db.users.update_one(
        { "_id": manager_id },
        { "$addToSet": { "cards": payload } }
    )

    if not response.modified_count:
        raise HTTPException(
            status_code=200,
            detail="Card couldn't be inserted"
        )

    return { "success":True }