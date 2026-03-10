from fastapi import APIRouter, HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import FormField
from auth import get_current_admin
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/api", tags=["Form Fields"])

db = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database

# Public endpoint - get enabled form fields
@router.get("/form-fields")
async def get_public_form_fields():
    fields = await db.form_fields.find({"enabled": True}).sort("order", 1).to_list(100)
    
    # Convert ObjectId to string
    for field in fields:
        field["_id"] = str(field["_id"])
    
    return fields

# Admin endpoint - get all form fields
@router.get("/admin/form-fields")
async def get_all_form_fields(current_user: dict = Depends(get_current_admin)):
    fields = await db.form_fields.find().sort("order", 1).to_list(100)
    
    for field in fields:
        field["_id"] = str(field["_id"])
    
    return fields

# Admin endpoint - create form field
@router.post("/admin/form-fields")
async def create_form_field(
    field_data: FormField,
    current_user: dict = Depends(get_current_admin)
):
    # Get the highest order number
    last_field = await db.form_fields.find_one(sort=[("order", -1)])
    order = (last_field["order"] + 1) if last_field else 0
    
    field_data.order = order
    result = await db.form_fields.insert_one(
        field_data.dict(by_alias=True, exclude={"id"})
    )
    
    return {
        "message": "Form field created",
        "id": str(result.inserted_id)
    }

# Admin endpoint - update form field
@router.put("/admin/form-fields/{field_id}")
async def update_form_field(
    field_id: str,
    field_data: dict,
    current_user: dict = Depends(get_current_admin)
):
    if not ObjectId.is_valid(field_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid field ID"
        )
    
    result = await db.form_fields.update_one(
        {"_id": ObjectId(field_id)},
        {"$set": field_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form field not found"
        )
    
    return {"message": "Form field updated"}

# Admin endpoint - delete form field
@router.delete("/admin/form-fields/{field_id}")
async def delete_form_field(
    field_id: str,
    current_user: dict = Depends(get_current_admin)
):
    if not ObjectId.is_valid(field_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid field ID"
        )
    
    result = await db.form_fields.delete_one({"_id": ObjectId(field_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form field not found"
        )
    
    return {"message": "Form field deleted"}

# Admin endpoint - reorder form fields
@router.put("/admin/form-fields/reorder")
async def reorder_form_fields(
    field_orders: List[dict],
    current_user: dict = Depends(get_current_admin)
):
    # field_orders should be [{"id": "...", "order": 0}, ...]
    for item in field_orders:
        if not ObjectId.is_valid(item["id"]):
            continue
        
        await db.form_fields.update_one(
            {"_id": ObjectId(item["id"])},
            {"$set": {"order": item["order"]}}
        )
    
    return {"message": "Form fields reordered"}
