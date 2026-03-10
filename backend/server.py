from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Import route modules
from routes import auth_routes, settings_routes, form_fields_routes, memorial_routes, user_routes, order_routes, abonnement_routes

import auth

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_host = os.environ['DB_HOST']
mongo_username = os.environ['BACK_USER']
mongo_password = os.environ['BACK_PASSWORD']
mongo_database = os.environ['DB_NAME']
print("Host %s %s %s" % (mongo_host,mongo_username,mongo_password))
client = AsyncIOMotorClient(host=mongo_host, username=mongo_username, password=mongo_password, authSource=mongo_database)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Inject database into route modules
auth_routes.set_db(db)
settings_routes.set_db(db)
form_fields_routes.set_db(db)
memorial_routes.set_db(db)
user_routes.set_db(db)
order_routes.set_db(db)
abonnement_routes.set_db(db)
auth.set_db(db)

# Include routers
app.include_router(auth_routes.router)
app.include_router(settings_routes.router)
app.include_router(form_fields_routes.router)
app.include_router(memorial_routes.router)
app.include_router(user_routes.router)
app.include_router(order_routes.router)
app.include_router(abonnement_routes.router)

# Health check endpoint
@app.get("/api/health")
async def health():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()