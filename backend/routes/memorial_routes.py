import random
from fastapi import APIRouter, HTTPException, Depends, Query, status, UploadFile, File,Form, Response, Request
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import Memorial, MemorialCreate, MemorialResponse, Tribute, TributeCreate, TributeResponse, Abonnement
from auth import get_current_manager, get_current_admin, get_current_user, get_manager_with_abonnement, get_db_memorial
from bson import ObjectId
from datetime import datetime
from utils import handleUploadedFiles, hasFileSizesGreaterThan
from typing import Optional, List
from pathlib import Path
import constants
from base64 import b64decode
from pymongo.errors import OperationFailure
import time
import secrets

router = APIRouter(prefix="/api", tags=["Memorials"])

db = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database

# Public endpoint - list memorials
@router.get("/memorials")
async def list_memorials(
    skip: int = Query(0, ge=0),
    limit: int = Query(12, ge=1, le=100),
    search: Optional[str] = None
):
    query = { "status": { "$ne":"suspended" } }
    if search:
        query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"birth_place": {"$regex": search, "$options": "i"}},
                {"death_place": {"$regex": search, "$options": "i"}}
            ]
        }
    
    total = await db.memorials.count_documents(query)
    memorials = await db.memorials.find(query).sort("date_created", -1).skip(skip).limit(limit).to_list(limit)
    
    # Get tribute counts for each memorial
    result = []
    for memorial in memorials:
        tributes_count = await db.tributes.count_documents({"memorial_id": memorial["_id"]})
        result.append(MemorialResponse(
            _id=str(memorial["_id"]),
            name=memorial["name"],
            birth_date=memorial.get("birth_date"),
            death_date=memorial.get("death_date"),
            birth_place=memorial.get("birth_place"),
            death_place=memorial.get("death_place"),
            biography=memorial.get("biography"),
            obituary=memorial.get("obituary"),
            image=memorial.get("image"),
            background_image=memorial.get('background_image'),
            background_sound=memorial.get('background_sound'),
            gallery=memorial['gallery'],
            videos=memorial['videos'],
            view_count=memorial['view_count'],
            custom_fields=memorial.get("custom_fields", {}),
            tributes_count=tributes_count,
            date_created=memorial["date_created"],
            date_updated=memorial["date_updated"],
            created_by=memorial['created_by']
        ))
    
    return {
        "total": total,
        "memorials": result
    }

# Public endpoint - get memorial by id
@router.get("/memorials/{memorial_id}")
async def get_memorial(memorial_id: str):
    if not ObjectId.is_valid(memorial_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid memorial ID"
        )
    
    memorial = await db.memorials.find_one({"_id": ObjectId(memorial_id)})

    if not memorial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memorial not found"
        )

    if memorial.get('status','') == 'suspended':
        raise HTTPException(
            status_code=402,
            detail="Paiement required"
        )
    
    tributes_count = await db.tributes.count_documents({"memorial_id": memorial['_id']})

    return MemorialResponse(
        _id=str(memorial["_id"]),
        name=memorial["name"],
        birth_date=memorial.get("birth_date"),
        death_date=memorial.get("death_date"),
        birth_place=memorial.get("birth_place"),
        death_place=memorial.get("death_place"),
        biography=memorial.get("biography"),
        obituary=memorial.get("obituary"),
        image=memorial.get("image"),
        background_image=memorial.get('background_image'),
        background_sound=memorial.get('background_sound'),
        gallery=memorial.get("gallery", []),
        videos=memorial['videos'],
        view_count=memorial['view_count'],
        custom_fields=memorial.get("custom_fields", {}),
        tributes_count=tributes_count,
        date_created=memorial["date_created"],
        date_updated=memorial['date_updated'],
        created_by=memorial['created_by']
    )

# Private endpoint - create memorial
@router.post("/memorials", status_code = 201)
async def create_memorial(
    memorial_data: MemorialCreate = Depends(), 
    current_user: dict = Depends(get_manager_with_abonnement)
    ):
    abonnement = current_user['abonnement']
    if abonnement.is_memorial_quota_reached():
        raise HTTPException(
            status_code=423,
            detail='Quota Reached'
            )

    abonnement.add_memorial()

    # Convert date strings to datetime
    memorial_dict = memorial_data.dict()
    if memorial_dict.get("birth_date"):
        memorial_dict["birth_date"] = datetime.fromisoformat(memorial_dict["birth_date"].replace('Z', '+00:00'))
    if memorial_dict.get("death_date"):
        memorial_dict["death_date"] = datetime.fromisoformat(memorial_dict["death_date"].replace('Z', '+00:00'))
    if memorial_dict.get('image'):
        memorial_dict['image'] = handleUploadedFiles([memorial_dict['image']])[0]
    if memorial_dict.get('background_image'):
        memorial_dict['background_image'] = handleUploadedFiles([memorial_dict['background_image']])[0]
    if memorial_dict.get('background_sound'):
        memorial_dict['background_sound'] = handleUploadedFiles([memorial_dict['background_sound']])[0]

    # Generate random avatar
    memorial_dict["date_created"]   = datetime.utcnow()
    memorial_dict["date_updated"]   = datetime.utcnow()
    memorial_dict['created_by']     = current_user['_id']
    memorial_dict['view_count']     = 0

    client = db.client

    async with await client.start_session(causal_consistency=True) as session:
        async with session.start_transaction():
            result = await db.memorials.insert_one(memorial_dict)

            if not result.inserted_id:
                raise HTTPException(
                    status_code=500,
                    detail="Coudlnt' insert the memorial"
                )

            response = await db.users.update_one({"_id": ObjectId(current_user['id'])}, { "$set": { "resources": abonnement.get_user_resources() } })
    
    return {
        "message": "Memorial created successfully",
        "id": str(result.inserted_id),
        "inserted":True
    }

# Public Endpoint Get tributes for a memorial
@router.get("/memorials/{memorial_id}/tributes")
async def get_tributes(memorial = Depends(get_db_memorial)):
    if not memorial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid memorial"
        )

    if memorial.get('status','') == 'suspended':
        raise HTTPException(
            status_code=402,
            detail="Memorial suspended"
        )
    
    tributes = await db.tributes.find(
        {"memorial_id": str(memorial['_id']), "approved": True}
    ).sort("created_at", -1).to_list(100)
    
    result = [
        TributeResponse(
            _id=str(tribute["_id"]),
            author_name=tribute["author_name"],
            text=tribute["text"],
            avatar=tribute.get("avatar"),
            created_at=tribute["date_created"]
        )
        for tribute in tributes
    ]
    
    return result

# Add tribute to memorial
@router.post("/memorials/{memorial_id}/tributes", status_code=201)
async def add_tribute(memorial_id: str, tribute_data: TributeCreate):
    if not ObjectId.is_valid(memorial_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid memorial ID"
        )
    
    # Verify memorial exists
    memorial = await db.memorials.find_one({"_id": ObjectId(memorial_id)})
    if not memorial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memorial not found"
        )

    creator_id = memorial['created_by']
    creator = await db.users.find_one(
        { "_id": creator_id }, 
        { "tributeSent": "$resources.tributeSent", "abonnement_id":"$abonnement.id" })

    if not creator:
        raise HTTPException(
            status_code=404,
            detail='Creator not found'
        )

    abonnement_id = ObjectId(creator['abonnement_id'])
    abonnement_data = await db.abonnements.find_one({ "_id": abonnement_id }, ['maxTribute'])

    if not abonnement_data:
        raise HTTPException(
            status_code=404,
            detail="Abonnement data not found"
        )

    maxTribute = abonnement_data['maxTribute']
    tributeSent = creator.get('tributeSent',None)

    if tributeSent:
        if tributeSent >= maxTribute:
            raise HTTPException(
                status_code=423,
                detail='Tribute quota reached'
            )
    
    # Create tribute
    tribute = Tribute(
        memorial_id=ObjectId(memorial_id),
        author_name=tribute_data.author_name,
        author_email=tribute_data.author_email,
        text=tribute_data.text,
        avatar=f"https://i.pravatar.cc/50?img={random.randint(1, 70)}",
        approved=True
    )

    client = db.client

    async with await client.start_session(causal_consistency=True) as session:
        async with session.start_transaction():
            result = await db.tributes.insert_one(tribute.dict(by_alias=True, exclude={"id"}))

            if result.inserted_id:
                try:
                    maxTribute = await db.tributes.count_documents({"memorial_id": str(memorial['_id']) })
                    response = await db.users.update_one(
                        { "_id": memorial['created_by'] }, 
                        { "$set": { "resources.tributeSent": maxTribute } })

                    if not response.modified_count:
                        print("The maxTribute resource of the user couldn't be updated",response)
                except Exception as e:
                    print(e)
                    raise HTTPException(
                        status_code=500,
                        detail='Failed to insert tribute'
                        )

            else:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to insert tribute"
                )
    
    return {
        "message": "Tribute added successfully",
        "id": str(result.inserted_id)
    }

# Add pictures to memorial
@router.post("/memorials/{memorial_id}/pictures", status_code=201)
async def add_pictures( 
    picture : list[UploadFile], 
    picture_mini: list[UploadFile],
    title: list[str] = list[Form()],
    memorial: dict = Depends(get_db_memorial),
    current_user = Depends(get_manager_with_abonnement)
    ):

    if memorial['created_by'] == current_user['_id']:
        abonnement = current_user['abonnement']
        pictureLength = len(picture)

        if not abonnement.is_picture_quota_reached():
            if not abonnement.picture_size_breached(picture):
                if not hasFileSizesGreaterThan(picture_mini, constants.MAX_MINIATURE_SIZE):
                    file_names = handleUploadedFiles(picture)
                    file_mini = handleUploadedFiles(picture_mini)
                    date_added = datetime.utcnow()
                    payload = [ 
                        { "src": file_names[x], "src_min": file_mini[x], "title": title[x], "date_added": date_added } 
                        for x in range(len(file_names)) 
                    ]

                    client = db.client
                    my_id = secrets.token_hex(3)

                    async with await client.start_session(causal_consistency=True) as session:
                        max_retry = 5

                        await session.with_transaction(lambda x: picture_updater(
                            session=session,
                            user_id=current_user['_id'],
                            memorial_id=memorial['_id'],
                            payload=payload,
                            pictureLength=pictureLength
                            ))
                    return {
                        "message": "Picture added successfully"
                    } 
                else:
                    raise HTTPException(400,"Minitature shouldn't be greater than %s size" % (constants.MAX_MINIATURE_SIZE)
                    )
            else:
                raise HTTPException(400,"Picture size breached")
        else:
            raise HTTPException(423,"Picture quota reached")
    else:
        raise HTTPException(401,"Not authorized to add anything")

async def picture_updater(session,user_id,memorial_id, pictureLength, payload):
    response = await db.memorials.update_one(
        {
            "_id": memorial_id
        }, 
        { 
            "$push": { 
                "gallery": { 
                    "$each": payload
                } 
            } 
        },
        session=session
    )
    if response.modified_count:
        response = await db.users.update_one(
            {
                "_id": user_id
            }, 
            { 
                "$inc": { "resources.pictureSent": pictureLength } 
            }, session=session)
        if not response.modified_count:
            raise HTTPException(504,'User abonement detail should be updated')
    else:
        raise HTTPException(
            status_code=505,
            detail='Photo not inserted')

#Remove Pictures
@router.delete('/memorials/{memorial_id}/pictures')
async def delete_pictures(
    src : str,
    memorial: dict = Depends(get_db_memorial),
    current_user = Depends(get_manager_with_abonnement)
):
    if memorial['created_by'] == current_user['_id']:
        src = b64decode(src).decode()
        response = await db.memorials.find_one({ "_id": memorial['_id'], "gallery": { "$elemMatch": { "src": src }  } },["gallery"])

        if response:
            old_gallery = response['gallery']
            new_gallery = [ x for x in response["gallery"] if x["src"] != src]

            client = db.client

            async with await client.start_session(causal_consistency=True) as session:
                async with session.start_transaction():
                    response = await db.memorials.update_one({ "_id": memorial['_id'] }, { "$set": { "gallery": new_gallery } })

                if response.modified_count:
                    response = await db.users.update_one(
                        {"_id": current_user["_id"]}, 
                        { "$set": { "resources.pictureSent": len(new_gallery)} })

                    status = 201 if response.modified_count else 200
                else:
                    raise HTTPException(status_code=200)

            return Response(status_code=status)
        else:
            raise HTTPException(400,'Resource not found')
    else:
        raise HTTPException(status_code=401)

# Add videos to memorial
@router.post("/memorials/{memorial_id}/videos", status_code=201)
async def add_videos(  
    video : list[UploadFile],
    picture_mini: list[UploadFile],
    title: list[str] = Form(),
    memorial: dict = Depends(get_db_memorial),
    current_user = Depends(get_manager_with_abonnement),
    ):

    if memorial['created_by'] == current_user['_id']:
        abonnement = current_user['abonnement']

        if not abonnement.is_video_quota_reached():
            if not abonnement.video_duration_breached(video):
                video_names = handleUploadedFiles(video)
                picture_mini = handleUploadedFiles(picture_mini)
                date_added = datetime.utcnow()
                payload = [ 
                    {"src": video_names[x], "src_min": picture_mini[x], "title": title[x], "date_added": date_added} 
                    for x in range(len(video_names))
                ]

                abonnement.add_videos(len(video_names))

                client = db.client

                async with await client.start_session(causal_consistency=True) as session:
                    await session.with_transaction(lambda x: video_updater(
                        session=session,
                        memorial_id=memorial['_id'],
                        user_id=current_user['_id'],
                        payload=payload,
                        videoSent=len(video_names)
                        ))

                return {
                    "message": "Vide added successfully"
                }
            else:
                raise HTTPException(400,'Video duration was breached')
        else:
            raise HTTPException(423,'Video quota reached')
    else:
        raise HTTPException(401,"Not authorized to add resource to this memorial"
        )
async def video_updater(session,memorial_id,user_id,payload,videoSent):
    response = await db.memorials.update_one(
        {
        "_id": memorial_id
        }, 
        { 
            "$push": { 
                "videos": { 
                    "$each": payload 
                } 
            } 
        },
        session=session
    )

    if response.modified_count:
        response = await db.users.update_one(
            {"_id": user_id}, 
            { "$inc":
                { "resources.videoSent": videoSent } 
            },
            session=session
        )

        if not response.modified_count:
            raise HTTPException(
                status_code=504,
                detail="Couldn't update the user abonnement detail"
            )
    else:
        raise HTTPException(500,"The videos couldn't be inserted")

#Deleting video
@router.delete('/memorials/{memorial_id}/videos')
async def delete_videos(
    src : str,
    memorial: dict = Depends(get_db_memorial),
    current_user = Depends(get_manager_with_abonnement)
):

    if memorial["created_by"] == current_user["_id"]:
        src = b64decode(src).decode()
        response = await db.memorials.find_one({ "_id": memorial["_id"], "videos": { "$elemMatch": { "src": src } } })

        if response:
            new_videos = [ x for x in response["videos"] if x["src"] !=  src ]

            client = db.client

            async with await client.start_session(causal_consistency=True) as session:
                async with session.start_transaction():
                    response = await db.memorials.update_one(
                        { "_id": memorial["_id"] },
                        { "$set": { "videos": new_videos } }
                    )

                    if response.modified_count:
                        response = await db.users.update_one(
                            { "_id": current_user["_id"] },
                            { "$set": { "resources.videoSent": len(new_videos) } }
                        );
                        status = 201 if response.modified_count else 200
                    else:
                        raise HTTPException(400, "Resource couldn't be deleted")

            return Response(status_code=status)
        else:
            raise HTTPException(404, "Resource not found")
    else:
        raise HTTPException(status_code=401)

#Get Memorial Resources
SAFE_DIRECTORY = Path("/home/backend/resources").resolve()
@router.get("/resources/{resource_name}")
async def get_resource(
    request : Request,
    resource_name: str,
    memorial = Depends(get_db_memorial)
):
    if memorial:
        if memorial.get('status',None) != 'suspended':
            url = str(request.url)
            url = url[0: url.index('?')]
            memorial = await db.memorials.find_one(
                { 
                    "_id": memorial["_id"],
                    "$or": [
                        { "gallery": { "$elemMatch": { "$or": [
                            { "src": url },
                            { "src_min": url }
                            ] } } 
                        },
                        { "videos": { "$elemMatch": { "$or": [
                            { "src": url },
                            { "src_min": url }
                            ] } }},
                        { "background_image": url },
                        { "background_sound": url },
                        { "image": url }
                    ] 
                })

            if memorial:
                file_path = (SAFE_DIRECTORY / resource_name).resolve()

                if file_path.exists():
                    if file_path.is_relative_to(SAFE_DIRECTORY):
                        ratar = FileResponse(file_path)

                        return ratar
                    else:
                        print("Attempted directory traversla", file_path)
                        raise HTTPException(404,'File not found')
                else:
                    raise HTTPException(404, "File don't exists");
            else:
                print("Trying to access resource of another memorial");
                raise HTTPException(404,'Memorial not found')
        else:
            raise HTTPException(402,'Paiement required. Memorial has been suspended')
    else:
        raise HTTPException(400,"Memorial was not found")

# Admin endpoints
#@router.get("/admin/memorials")
async def admin_list_memorials(current_user: dict = Depends(get_current_admin)):
    memorials = await db.memorials.find().sort("created_at", -1).to_list(1000)
    
    result = []
    for memorial in memorials:
        tributes_count = await db.tributes.count_documents({"memorial_id": memorial["_id"]})
        result.append(MemorialResponse(
            _id=str(memorial["_id"]),
            name=memorial["name"],
            birth_date=memorial.get("birth_date"),
            death_date=memorial.get("death_date"),
            birth_place=memorial.get("birth_place"),
            death_place=memorial.get("death_place"),
            biography=memorial.get("biography"),
            obituary=memorial.get("obituary"),
            image=memorial.get("image"),
            gallery=memorial.get("gallery", []),
            custom_fields=memorial.get("custom_fields", {}),
            tributes_count=tributes_count,
            created_at=memorial["created_at"]
        ))
    
    return result

#@router.put("/admin/memorials/{memorial_id}")
async def admin_update_memorial(
    memorial_id: str,
    memorial_data: dict,
    current_user: dict = Depends(get_current_admin)
):
    if not ObjectId.is_valid(memorial_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid memorial ID"
        )
    
    memorial_data["updated_at"] = datetime.utcnow()
    
    result = await db.memorials.update_one(
        {"_id": ObjectId(memorial_id)},
        {"$set": memorial_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memorial not found"
        )
    
    return {"message": "Memorial updated successfully"}

#@router.delete("/admin/memorials/{memorial_id}")
async def admin_delete_memorial(
    memorial_id: str,
    current_user: dict = Depends(get_current_admin)
):
    if not ObjectId.is_valid(memorial_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid memorial ID"
        )
    
    # Delete memorial and all its tributes
    await db.tributes.delete_many({"memorial_id": ObjectId(memorial_id)})
    result = await db.memorials.delete_one({"_id": ObjectId(memorial_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memorial not found"
        )
    
    return {"message": "Memorial deleted successfully"}
