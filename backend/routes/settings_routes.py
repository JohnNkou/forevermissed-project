from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import SiteSettings, LayoutSettings
from auth import get_current_admin
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/api", tags=["Settings"])

db = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database

# Public endpoint - get site settings
@router.get("/settings")
async def get_public_settings():
    site_settings = await db.site_settings.find_one()
    layout_settings = await db.layout_settings.find_one()
    
    # If no settings exist, create defaults
    if not site_settings:
        default_site = SiteSettings()
        await db.site_settings.insert_one(default_site.dict(by_alias=True, exclude={"id"}))
        site_settings = await db.site_settings.find_one()
    
    if not layout_settings:
        default_layout = LayoutSettings()
        await db.layout_settings.insert_one(default_layout.dict(by_alias=True, exclude={"id"}))
        layout_settings = await db.layout_settings.find_one()
    
    # Convert ObjectId to string
    if site_settings:
        site_settings["_id"] = str(site_settings["_id"])
    if layout_settings:
        layout_settings["_id"] = str(layout_settings["_id"])
    
    return {
        "site": site_settings,
        "layout": layout_settings
    }

# Admin endpoint - get site settings
@router.get("/admin/settings/site")
async def get_site_settings(current_user: dict = Depends(get_current_admin)):
    settings = await db.site_settings.find_one()
    
    if not settings:
        default_settings = SiteSettings()
        await db.site_settings.insert_one(default_settings.dict(by_alias=True, exclude={"id"}))
        settings = await db.site_settings.find_one()
    
    if settings:
        settings["_id"] = str(settings["_id"])
    
    return settings

# Admin endpoint - update site settings
@router.put("/admin/settings/site")
async def update_site_settings(
    settings_data: dict,
    current_user: dict = Depends(get_current_admin)
):
    settings = await db.site_settings.find_one()
    
    if not settings:
        # Create new settings
        new_settings = SiteSettings(**settings_data)
        result = await db.site_settings.insert_one(
            new_settings.dict(by_alias=True, exclude={"id"})
        )
        return {"message": "Settings created", "id": str(result.inserted_id)}
    
    # Update existing settings
    settings_data["updated_at"] = datetime.utcnow()
    await db.site_settings.update_one(
        {"_id": settings["_id"]},
        {"$set": settings_data}
    )
    
    return {"message": "Settings updated successfully"}

# Admin endpoint - get layout settings
@router.get("/admin/settings/layout")
async def get_layout_settings(current_user: dict = Depends(get_current_admin)):
    settings = await db.layout_settings.find_one()
    
    if not settings:
        default_settings = LayoutSettings()
        await db.layout_settings.insert_one(default_settings.dict(by_alias=True, exclude={"id"}))
        settings = await db.layout_settings.find_one()
    
    if settings:
        settings["_id"] = str(settings["_id"])
    
    return settings

# Admin endpoint - update layout settings
@router.put("/admin/settings/layout")
async def update_layout_settings(
    settings_data: dict,
    current_user: dict = Depends(get_current_admin)
):
    settings = await db.layout_settings.find_one()
    
    if not settings:
        new_settings = LayoutSettings(**settings_data)
        result = await db.layout_settings.insert_one(
            new_settings.dict(by_alias=True, exclude={"id"})
        )
        return {"message": "Layout settings created", "id": str(result.inserted_id)}
    
    await db.layout_settings.update_one(
        {"_id": settings["_id"]},
        {"$set": settings_data}
    )
    
    return {"message": "Layout settings updated successfully"}
