from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import AbonnementCreate, AbonnementModify
from bson import ObjectId
from auth import get_current_admin, get_abonnement

router = APIRouter(prefix="/api/abonnements", tags=["Abonnements"])

# This will be injected from server.py
db = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database

#Public Endpoint
@router.get("/")
async def register():
    response = await db.abonnements.find().to_list(1000)

    for abon in response:
        abon["_id"] = str(abon["_id"])
        abon['price'] = abon['price'].to_decimal()

    return { "abonnements": response }

@router.get("/{abonnement_id}")
async def get(abonnement : dict = Depends(get_abonnement)):
    if abonnement:
        abonnement['_id'] = str(abonnement['_id'])
        abonnement['price'] = abonnement['price'].to_decimal()

    return { "data": abonnement }

#Admin Only
@router.post("/", status_code=201)
async def add(abonnement: AbonnementCreate, admin: dict = Depends(get_current_admin)):
    abonnement_dict = abonnement.to_dict()

    response = await db.abonnements.insert_one(abonnement_dict)

    if response.inserted_id:
        return { "insertedId": str(response.inserted_id) }
    else:
        raise HTTPException(200,"Wasn able to insert abonnement")

@router.put('/{abonnement_id}', status_code=201)
async def modify(modified_abonnement: AbonnementModify, abonnement : dict = Depends(get_abonnement), admin: dict = Depends(get_current_admin)):
    abonnement_dict = modified_abonnement.to_dict()

    if abonnement_dict:
        response = await db.abonnements.update_one(
            { "_id": abonnement["_id"] },
            { "$set": abonnement_dict }
            )

        if response.modified_count:
            return
        else:
            raise HTTPException(200,"Nothing was modified")
    else:
        print("Admin sent empty abonnement", abonnement_dict)
        raise HTTPException(200,'Empty abonnement')