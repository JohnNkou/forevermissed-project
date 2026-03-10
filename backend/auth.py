from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
import os
from models import Abonnement, OrderPayload, Order

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
db = None

security = HTTPBearer()

def set_db(database):
    global db
    db = database

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_token(token)

    payload["_id"] = ObjectId(payload['id'])
    return payload

def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

def get_current_manager(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

async def get_manager_with_abonnement(current_admin: dict = Depends(get_current_manager)) -> dict:
    abonnement = await Abonnement.get_instance(current_admin['id'],db)

    if not abonnement:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User don't have an abonnement"
        )

    current_admin['abonnement'] = abonnement

    return current_admin

async def get_db_memorial(memorial_id: str) -> dict:
    memorial = await db.memorials.find_one({"_id": ObjectId(memorial_id)}, ["created_by","status"])

    return memorial

async def get_order_data(orderPayload: OrderPayload):
    orderData = await Order.get_instance(db,orderPayload)

    return orderData 

async def get_abonnement(abonnement_id: str) -> dict:
    abonnement = await db.abonnements.find_one({"_id": ObjectId(abonnement_id)})

    return abonnement