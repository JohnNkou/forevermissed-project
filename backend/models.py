from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from fastapi import HTTPException, Form, UploadFile, File
from bson import ObjectId, Decimal128
import pathlib
import tempfile
import cv2
import shutil
import json
from dataclasses import dataclass

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

# Site Settings
class LogoSettings(BaseModel):
    url: Optional[str] = None
    text: str = "ForeverMissed"

class ColorSettings(BaseModel):
    primary: str = "#f43f5e"  # rose-500
    secondary: str = "#8b5cf6"  # purple-500
    accent: str = "#3b82f6"  # blue-500
    background: str = "#ffffff"
    text: str = "#111827"

class SiteSettings(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    logo: LogoSettings = LogoSettings()
    colors: ColorSettings = ColorSettings()
    language: str = "en"
    site_title: str = "ForeverMissed"
    trust_badge: str = "Trusted by 280,000+ families across 47 countries"
    footer_text: str = "© 2025 ForeverMissed. All rights reserved."
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Layout Settings
class HeaderSettings(BaseModel):
    position: str = "sticky"  # 'sticky' or 'static'
    height: int = 64
    background: str = "#ffffff"

class FooterSettings(BaseModel):
    columns: int = 4
    background: str = "#111827"

class ButtonSettings(BaseModel):
    size: str = "md"  # 'sm', 'md', 'lg'
    position: str = "left"
    border_radius: str = "6px"
    primary_color: str = "#000000"
    secondary_color: str = "#ffffff"

class BannerSettings(BaseModel):
    show: bool = True
    image_url: Optional[str] = None
    title: str = "Create a Memorial Website"
    subtitle: str = "Preserve and share memories of your loved one"

class LayoutSettings(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    header: HeaderSettings = HeaderSettings()
    footer: FooterSettings = FooterSettings()
    buttons: ButtonSettings = ButtonSettings()
    banner: BannerSettings = BannerSettings()

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Form Field
class FormField(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    field_name: str
    field_type: str  # 'text', 'textarea', 'date', 'select', 'file'
    label: str
    placeholder: str = ""
    required: bool = False
    order: int = 0
    options: List[str] = []
    enabled: bool = True

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Card
class Card(BaseModel):
    id: str
    number: str
    ccv: int
    expiration_date: str

    async def is_valid(self,db):
        if not ObjectId.is_valid(self.id):
            print("Passed in id is not valid", self.id)
            return False

        return await db.cards.find_one({ 
            "_id": ObjectId(self.id),
            "number": self.number,
            "ccv": self.ccv,
            "expiration_date": self.expiration_date 
        })

# User
class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: EmailStr
    password: str
    name: str
    role: str = "manager"  # 'admin' or 'manager'
    profile_picture: Optional[str] = None
    date_created: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserModif(BaseModel):
    email: EmailStr = None
    password: str = None
    name: str = None
    role : str = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    profile_picture: Optional[str] = None
    date_created: datetime
    abonnement: Optional[dict] = None
    resources: Optional[dict] = None

    class Config:
        populate_by_name = True


class Otp(BaseModel):
    code: str

class UserCreate(BaseModel):
    email: str # Should revert to EmailStr. For testing purpose a set the email to str
    password: str
    name: str
    role: str = "manager"

class UserLogin(BaseModel):
    email: str  #Should revert to EmailStr. For same reason
    password: str

# Memorial
class Memorial(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    birth_date: Optional[datetime] = None
    death_date: Optional[datetime] = None
    birth_place: Optional[str] = None
    death_place: Optional[str] = None
    biography: Optional[str] = None
    obituary: Optional[str] = None
    image: Optional[str] = None
    background_image: Optional[str] = None
    quotes: List[str] = []
    life_summary: Optional[str] = None
    circumstances: Optional[str] = None
    autoplay_audio: Optional[str] = None
    view_count: int = 0
    gallery: List[str] = []
    videos:  List[str] = []
    custom_fields: Dict[str, Any] = {}
    created_by: Optional[PyObjectId] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}

@dataclass
class MemorialCreate:
    name: str = Form()
    birth_date: str = Form()
    death_date: Optional[str] = Form()
    birth_place: str = Form()
    death_place: Optional[str] = Form()
    biography: Optional[str] = Form()
    obituary: Optional[str] = Form()
    image: UploadFile = File(),
    background_image: Optional[UploadFile] = File()
    background_sound: Optional[UploadFile] = File()

    def dict(self):
        res = {};

        res["name"] = self.name
        res['birth_date'] = self.birth_date
        res["death_place"] = self.death_place
        res["birth_place"] = self.birth_place
        res['death_place'] = self.death_place
        res['death_date'] = self.death_date
        res['biography'] = self.biography
        res['obituary'] = self.obituary
        res['image'] = self.image
        res['background_image'] = self.background_image
        res['background_sound'] = self.background_sound
        res['gallery'] = []
        res['videos'] = []
        
        return res

class MaxResource(BaseModel):
    def to_dict(self):
        return { key: self.__dict__[key] for key in self.__dict__ }

class MaxVideo(MaxResource):
    number : int
    time: int

class MaxPicture(MaxResource):
    number: int
    size: int

class AbonnementTemplate(BaseModel):
    def to_dict(self):
        decimals = ['price']
        data = {}

        for key in self.__dict__:
            value = self.__dict__[key]

            if value:
                if key in decimals:
                    value = Decimal128(str(value))
                elif isinstance(value,MaxResource):
                    value = value.to_dict()

                data[key] = value

        return data
class AbonnementCreate(AbonnementTemplate):
    type : str
    maxVideo : MaxVideo
    maxPicture : MaxPicture
    maxMemorial : int
    frequency : List[str]
    currency: Literal['USD','CDF']
    price: int
    maxTribute: int

class AbonnementModify(AbonnementTemplate):
    type : str = None
    maxVideo : MaxVideo = None
    maxPicture : MaxPicture = None
    maxMemorial : int = None
    frequency : List[str] = None
    currency: Literal['USD'] = None
    price: int = None
    maxTribute: int = None 

class Resource(BaseModel):
    src: str
    src_min: str
    title: str
    date_added: datetime



class MemorialResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    birth_date: Optional[datetime] = None
    death_date: Optional[datetime] = None
    birth_place: Optional[str] = None
    death_place: Optional[str] = None
    biography: Optional[str] = None
    obituary: Optional[str] = None
    image: Optional[str] = None
    background_image: Optional[str] = None
    background_sound: Optional[str] = None
    gallery: List[Resource] = []
    tributes_count: int = 0
    view_count: int
    date_created: datetime
    date_updated: datetime
    created_by: PyObjectId
    videos: List[Resource]

    class Config:
        populate_by_name = True

# Tribute
class Tribute(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    memorial_id: PyObjectId
    author_name: str
    author_email: Optional[EmailStr] = None
    text: str
    avatar: Optional[str] = None
    approved: bool = True
    date_created: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class TributeCreate(BaseModel):
    author_name: str
    author_email: Optional[EmailStr] = None
    text: str

class TributeResponse(BaseModel):
    id: str = Field(alias="_id")
    author_name: str
    text: str
    avatar: Optional[str] = None
    created_at: datetime

    class Config:
        populate_by_name = True

# Life Events
class LifeEvent(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    memorial_id: PyObjectId
    title: str
    description: str
    date: Optional[datetime] = None
    images: List[str] = []
    category: str  # 'childhood', 'education', 'professional', 'milestone'
    order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Media Upload (Photos/Videos/Audio)
class MediaUpload(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    memorial_id: PyObjectId
    uploaded_by: str  # visitor name
    uploader_email: Optional[EmailStr] = None
    media_type: str  # 'photo', 'video', 'audio'
    media_url: str
    caption: Optional[str] = None
    admin_approved: bool = False
    owner_approved: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Family Members
class FamilyMember(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    memorial_id: PyObjectId
    name: str
    relationship: str
    photo: Optional[str] = None
    order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

#Order Details

class OrderPayload(BaseModel):
    abonnement: dict
    payment_data: dict


class AbonnementOrder(object):
    """docstring for AbonnementOrder"""
    def __init__(self,abonnement):
        self.abonnement = abonnement

    def get_price_details(self):
        price = self.abonnement['price']

        if self.abonnement['frequency'] == 'yearly':
            price *= 12

        return (price, self.abonnement['currency'])

    def get_id(self):
        return self.abonnement['_id']

    def get_frequency(self):
        return self.abonnement['frequency']

    def get_type(self):
        return self.abonnement['type']

class Order:
    """docstring for Order"""
    allowed_frequency = ['monthly','yearly']

    def __init__(self, abonnement, payment_card):
        self.abonnement = abonnement
        self.payment_card = payment_card

    def get_abonnement(self):
        return self.abonnement

    def get_payment_card(self):
        return self.payment_card

    @staticmethod
    async def get_instance(db, orderPayload):
        abonnement = orderPayload.abonnement
        payment_card = orderPayload.payment_data
        frequency = abonnement['frequency']

        if not frequency in Order.allowed_frequency:
            raise HTTPException(
                status_code=400,
                detail='Bad data'
                )

        abonnement = await db.abonnements.find_one(
            { "_id": ObjectId(abonnement['id']) },
            ['type','frequency','price','currency']
        )

        payment_card = await db.cards.find_one(
            { "_id": ObjectId(payment_card['_id']) }
        )

        if not abonnement:
            raise HTTPException(
                status_code=400,
                detail='Abonnement not found'
            )

        if not payment_card:
            raise HTTPException(
                status_code=402,
                detail='PaymentCard not found but required'
            )

        abonnement['frequency'] = frequency
        abonnement['price'] = abonnement['price'].to_decimal()
        payment_card['amount'] = payment_card['amount'].to_decimal()

        payment_card = PaymentCard(payment_card,db.cards)

        return Order(AbonnementOrder(abonnement), payment_card)


class PaymentCard:
    """docstring for PaymentCard"""
    def __init__(self, card,collection):
        self.card = card
        self.collection = collection

    def get_amount(self):
        return self.card['amount']

    def get_number(self):
        return self.card['number']

    def get_expiration_date(self):
        return self.card['expiration_date']

    def get_ccv(self):
        return self.card['ccv']

    def get_currency(self):
        return self.card['currency'].lower()

    def to_json(self):
        card = dict(self.card)
        card['amount'] = Decimal128(card['amount'])
        return card

    async def pay(self, price, currency):
        card_currency = self.get_currency()
        card_amount = self.get_amount()
        if card_currency != currency.lower():
            print("Card currenty different from abonnement currency. %s %s" % (card_currency, currency))
            return False

        if card_amount < price:
            print("Card amount less the required price. %s %s" % (card_amount, price))
            return False

        collection = self.collection
        price *= -1;

        response = await collection.update_one(
            { "_id": self.card['_id'] },
            { "$inc": { "amount": Decimal128(price) } }
        )

        if not response.modified_count:
            print("Amount coulnd't be updated",response)
            return False

        return True
              

#Abonnement Class
        

class Abonnement():
    """docstring for ClassName"""
    def __init__(self,abonnement,resources):
        self.maxVideoNumber     = abonnement['maxVideo']['number']
        self.maxVideoSecond     = abonnement['maxVideo']['time']
        self.maxPictureNumber   = abonnement['maxPicture']['number']
        self.maxPictureSize     = abonnement['maxPicture']['size']
        self.maxMemorialNumber  = abonnement['maxMemorial']
        totalMinute             = self.maxVideoNumber * abonnement['maxVideo']['time']
        self.videoLeft          = self.maxVideoNumber - resources['videoSent']
        self.pictureLeft        = self.maxPictureNumber - resources['pictureSent']
        self.memorialLeft       = self.maxMemorialNumber - resources['memorialCreated']
        self.minuteLeft         = totalMinute - resources['minuteSent']
        self.type               = abonnement['type']
        self.quotaReached       = { 'video':False, 'picture':False, 'minute':False, 'memorial':False }
        self.abonnement         = abonnement
        self.resources          = resources

        if not self.memorialLeft:
            self.quotaReached['memorial'] = True
        if not self.minuteLeft:
            self.quotaReached['minute'] = True
        if not self.pictureLeft:
            self.quotaReached['picture'] = True
        if not self.videoLeft:
            self.quotaReached['video'] = True

    def picture_size_breached(self,pictures):
        for picture in pictures:
            if picture.size > self.maxPictureSize:
                return True

        return False

    def video_duration_breached(self,videos):
        for video in videos:
            filename = pathlib.PurePath(video.filename)

            with tempfile.NamedTemporaryFile(delete=False, suffix=filename.suffix) as tmp:
                shutil.copyfileobj(video.file, tmp)
                tmp_path = tmp.name

            video = cv2.VideoCapture(tmp_path)
            frames = video.get(cv2.CAP_PROP_FRAME_COUNT)
            fps = video.get(cv2.CAP_PROP_FPS)
            duration_seconds = float(frames) / float(fps)
            video.release()

            if duration_seconds > self.maxVideoSecond:
                return True

        return False

    def add_memorial(self):
        newMemorialCreated = self.resources['memorialCreated'] + 1
        self.resources['memorialCreated'] = min(newMemorialCreated, self.maxMemorialNumber)


    def add_pictures(self,number):
        newPictureSent = self.resources['pictureSent'] + number
        self.resources['pictureSent'] = min(newPictureSent, self.maxPictureNumber)

    def get_pictures_sent(self):
        return self.resources['pictureSent']

    def add_videos(self,number):
        newVideoSent = self.resources['videoSent'] + number
        self.resources['videoSent'] = min(newVideoSent, self.maxVideoNumber)

    def is_picture_quota_reached(self):
        return self.quotaReached['picture']

    def is_video_quota_reached(self):
        return self.quotaReached['video']

    def is_memorial_quota_reached(self):
        return self.quotaReached['memorial']

    def get_user_resources(self):
        return self.resources

    @staticmethod
    async def get_instance(id,db):
        user_abonnement = await db.users.find_one({"_id": ObjectId(id), "abonnement":{ "$exists": True }}, ['abonnement','resources'])
        if not user_abonnement:
            return None

        resources = user_abonnement['resources']
        user_abonnement = user_abonnement['abonnement']

        abonnement = await db.abonnements.find_one({"_id": user_abonnement['id']})

        return Abonnement(abonnement, resources)