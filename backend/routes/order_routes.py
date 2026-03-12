from fastapi import APIRouter, HTTPException, Depends, status, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from auth import get_order_data, get_current_manager, get_current_admin, get_current_user
from models import PaymentCard
from bson import ObjectId, Decimal128
from datetime import datetime
import os
import utils
import json

router = APIRouter(prefix="/api/order", tags=["Paiments"])

# This will be injected from server.py
db = None

def set_db(database: AsyncIOMotorDatabase):
    global db
    db = database

@router.get("/", status_code=200)
async def get(user: dict = Depends(get_current_user), status : str = None):
    query = {}
    isManager = user['role'] == 'manager'

    if isManager:
        query['email'] = user['email']

        if not status:
            query['status'] = { "$nin": [ 'processing' ] }

    if status:
        query['status'] = status


    response = await db.orders.find(query,
        projection={
            "_id": { "$toString": "$_id" },
            "abonnementId": { "$toString": "$abonnementId" },
            "price":1, "currency":1, "email":1, "status":1,"date_created":1, "due_date":1, "abonnementType":1
        }
    ).sort('date_created', -1).to_list(1000)

    for order in response:
        if order.get('date_created'):
            order['date_created'] = order['date_created'].isoformat()[:-3] + 'Z'
            order['due_date'] = order['due_date'].isoformat()[:-3] + 'Z'

        order['price'] = order['price'].to_decimal()

    return { "orders": response }

"""
    201 -> Successfull ordering
    400 -> Payment not successfull
    500 -> Order coudln't be added, Abonnement info couldn't be inserted
"""
@router.post("/", status_code=201)
async def add(user: dict = Depends(get_current_manager),  orderData: dict = Depends(get_order_data)):
    
    abonnement = orderData.get_abonnement()
    (price, currency) = abonnement.get_price_details()
    date_created = datetime.utcnow()
    frequency = abonnement.get_frequency()
    update_data = {
        "abonnement":{
            "id": abonnement.get_id(),
            "type": abonnement.get_type(),
            "frequency": frequency,
            "date_created":  date_created,
            "expiration_date": utils.get_expiration_date(date_created,frequency),
            "checking": False
        }
    }

    user_abonnement = await db.users.find_one({ "_id": user["_id"], "abonnement": { "$exists": True } })

    if user_abonnement:
        raise HTTPException(
            status_code=400
        )
    
    payment_card = orderData.get_payment_card()

    if not await payment_card.pay(price,currency):
        raise HTTPException(
            status_code=400,
            detail="Le paiement n'a pas pu être effectué"
        )

    response = await db.users.find_one({ "_id": user['_id'], "resources": { "$exists":True } })

    if not response:
        update_data['resources'] = {
            "videoSent":0,
            "pictureSent":0,
            "minuteSent":0,
            "memorialCreated":0,
            "tributeSent":0
        }

    client = db.client

    async with await client.start_session(causal_consistency=True) as session:
        await session.with_transaction(lambda x: update_user_order(
            session=session,
            update_data=update_data,
            payment_card=payment_card,
            abonnement=abonnement,
            currency=currency,
            price=price,
            user=user,
            date_created=date_created
            ))
            

    return {
        "inserted":True
    }

async def update_user_order(
    user,
    abonnement, 
    payment_card, 
    update_data, 
    price, 
    currency,
    session,
    date_created
):
    response = await db.orders.insert_one(
        {
            "abonnementId": abonnement.get_id(),
            "abonnementType": abonnement.get_type(),
            "email": user['email'],
            "price": Decimal128(price),
            "currency": currency,
            "date_created": date_created,
            "status": "new",
            "due_date": date_created
        },
        session=session
    )
    if not response.inserted_id:
        raise HTTPException(
            status_code=500,
            detail='Was unable to add the order'
        )
    update_data['default_payment'] = payment_card.to_json()
    response = await db.users.update_one(
        { "_id": user['_id'] },
        { "$set": update_data }
    )
    if not response.modified_count:
        raise HTTPException(
            status_code=500,
            detail="Abonnement info couldn't be inserted"
        )

@router.put('/pay/{order_id}', status_code=201)
async def pay_order(order_id: str, user : dict = Depends(get_current_manager)):
    order = await db.orders.find_one({ "_id": ObjectId(order_id) })

    if order:
        user = await db.users.find_one({ "email": user['email'] }, ['cards'])
        cards = user.get('cards')

        if cards:
            card = [ x for x in cards if x.get('default') == True ].pop()

            if card:
                card = await db.cards.find_one({ "_id": card['id'] });

                print("Card is", card)

                if card:
                    payment_card = PaymentCard(card, db.cards)
                    price = order['price'].to_decimal()
                    currency = order['currency']

                    client = db.client

                    async with await client.start_session(causal_consistency=True) as session:

                        result = await session.with_transaction(lambda x: pay_order(
                            order_id, price, currency, payment_card, session
                            ))

                    if result:
                        return { "inserted": True }
                    else:
                        raise HTTPException(400,"Order couldn't be paid")
                else:
                    raise HTTPException(404,"Card not found in cards")


        print("User has no default card")
        raise HTTPException(404, "User has no default card")
    else:
        print("No order found")
        raise HTTPException(404, 'No order found')

async def pay_order(order_id, price, currency, payment_card, session):
    if await payment_card.pay(price, currency, session):
        response = await db.orders.update_one({ "_id": ObjectId(order_id) }, { "$set": { "status": "paid" } }, session=session)

        return response.modified_count > 0
    else:
        return False