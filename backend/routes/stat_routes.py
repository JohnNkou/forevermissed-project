from fastapi import APIRouter, HTTPException, Depends, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth import get_current_admin, get_optional_user

router = APIRouter(prefix="/api/stats", tags=["Stats"])

db = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database

# Public endpoint - get site settings

@router.get('/')
async def get_global_stats(user: dict = Depends(get_optional_user)):
    stages = [
        { "$count": "stats" },
        { "$addFields": { "collection": "users" } },
        {
            "$unionWith":{
                "coll": "memorials",
                "pipeline":[
                    { "$count":"stats" },
                    { "$addFields": { "collection":"memorials" } }
                ]
            }
        },
        {
            "$unionWith":{
                "coll": "tributes",
                "pipeline":[
                    { "$count": "stats" },
                    { "$addFields": { "collection":"tributes" } }
                ]
            }
        }
    ]
    orderStage = {
    "$unionWith":{
        "coll": "orders",
        "pipeline":[
            { 
                "$group":{
                    "_id":{
                        "table":{
                            "$cond":[
                                { "$eq": ["$status","paid"] },
                                "payments",
                            "debts"
                            ]
                        },
                        "currency":"$currency"
                    },
                    "stats": { "$sum":"$price" }
                }
            },
            { "$addFields": { "collection":"$_id.table" } },
            {
                "$project":{
                    "_id":0,
                    "stats":{ "$toDouble": "$stats" },
                    "currency":"$_id.currency",
                    "collection":1
                }
            }
            ]
        }
    }

    if user and user.get("role") == 'admin':
        stages.append(orderStage)

    items = await db.users.aggregate(stages).to_list(1000);

    stats = {}

    for item in items:
        if not item.get('currency'):
            stats[item['collection']] = item['stats']
        else:
            data = stats.get(item['collection'])

            if not data:
                data = stats[item['collection']] = []

            data.append({ "stats": item["stats"], "currency": item["currency"] })

    return { "stats": stats }

@router.get("/memorials")
async def get_memorial_stats(year: int = Query(None, ge=1900, le=4000)):
    query = { }
    group = { "_id":None, "total": { "$count": {} } }
    total = 0

    if year:
        query["$expr"] = {
            "$eq":[
                { "$year": "$date_created" },
                year
            ]
        }

    response = await db.memorials.aggregate([
        { "$match": query },
        { "$group": group }
    ]).next()

    if response:
        total = response["total"]

    return { "stats": total }

@router.get('/tributes')
async def get_tribute_stats():

    stats = await db.tributes.count_documents({})

    return { "stats": stats }

@router.get('/transactions')
async def get_transaction_stats(year: int = Query(None, ge=1900, le=3000), user: dict = Depends(get_current_admin)):
    query = { "$match": {} }

    if year:
        query["$match"] = {
            "$expr":{
                "$eq": [
                    { "$year": "$date_created" },
                    year
                ]
            }
        }

    stats = await db.orders.aggregate([
        query,
        { 
            "$group":{
                "_id": { 
                    "currency":"$currency", 
                    "isPaid": { "$eq": [ "$status", "paid" ] }
                },
                "total": { "$sum":"$price" }
            }
        },
        {
            "$project":{
                "_id":1,
                "total": { "$toDouble": "$total" }
            }
        }
    ]).to_list(2)

    return { "stats": stats }