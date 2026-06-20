from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Response, Header, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import requests
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Object storage config
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "family3d")
storage_key: Optional[str] = None

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def init_storage() -> str:
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============== MODELS ==============

class MemberBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    gender: Literal["male", "female", "other"] = "other"
    birth_date: Optional[str] = None  # ISO date string YYYY-MM-DD
    bio: Optional[str] = None
    photo_path: Optional[str] = None
    parent_ids: List[str] = Field(default_factory=list)
    partner_ids: List[str] = Field(default_factory=list)


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    gender: Optional[Literal["male", "female", "other"]] = None
    birth_date: Optional[str] = None
    bio: Optional[str] = None
    photo_path: Optional[str] = None
    parent_ids: Optional[List[str]] = None
    partner_ids: Optional[List[str]] = None


class Member(MemberBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Family Tree 3D API"}


@api_router.get("/members", response_model=List[Member])
async def list_members():
    docs = await db.members.find({}, {"_id": 0}).to_list(2000)
    return docs


@api_router.post("/members", response_model=Member)
async def create_member(payload: MemberCreate):
    # Validate references
    if payload.parent_ids:
        if len(payload.parent_ids) > 2:
            raise HTTPException(400, "A member can have at most 2 parents")
        for pid in payload.parent_ids:
            exists = await db.members.find_one({"id": pid}, {"_id": 0})
            if not exists:
                raise HTTPException(400, f"Parent {pid} not found")

    if payload.partner_ids:
        for pid in payload.partner_ids:
            exists = await db.members.find_one({"id": pid}, {"_id": 0})
            if not exists:
                raise HTTPException(400, f"Partner {pid} not found")

    member = Member(**payload.model_dump())
    await db.members.insert_one(member.model_dump())

    # Mirror partner relationship
    for pid in member.partner_ids:
        await db.members.update_one(
            {"id": pid},
            {"$addToSet": {"partner_ids": member.id}}
        )

    return member


@api_router.patch("/members/{member_id}", response_model=Member)
async def update_member(member_id: str, payload: MemberUpdate):
    existing = await db.members.find_one({"id": member_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Member not found")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}

    # Validate parent refs
    new_parents = update_data.get("parent_ids", existing.get("parent_ids", []))
    if len(new_parents) > 2:
        raise HTTPException(400, "A member can have at most 2 parents")
    for pid in new_parents:
        if pid == member_id:
            raise HTTPException(400, "A member cannot be their own parent")
        if not await db.members.find_one({"id": pid}, {"_id": 0}):
            raise HTTPException(400, f"Parent {pid} not found")

    new_partners = update_data.get("partner_ids", existing.get("partner_ids", []))
    for pid in new_partners:
        if pid == member_id:
            raise HTTPException(400, "A member cannot be their own partner")
        if not await db.members.find_one({"id": pid}, {"_id": 0}):
            raise HTTPException(400, f"Partner {pid} not found")

    if update_data:
        await db.members.update_one({"id": member_id}, {"$set": update_data})

    # Sync partner mirror
    if "partner_ids" in update_data:
        old_partners = set(existing.get("partner_ids", []))
        new_set = set(update_data["partner_ids"])
        for pid in new_set - old_partners:
            await db.members.update_one({"id": pid}, {"$addToSet": {"partner_ids": member_id}})
        for pid in old_partners - new_set:
            await db.members.update_one({"id": pid}, {"$pull": {"partner_ids": member_id}})

    updated = await db.members.find_one({"id": member_id}, {"_id": 0})
    return updated


@api_router.delete("/members/{member_id}")
async def delete_member(member_id: str):
    existing = await db.members.find_one({"id": member_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Member not found")

    # Remove this member from others' references
    await db.members.update_many({}, {"$pull": {"parent_ids": member_id, "partner_ids": member_id}})
    await db.members.delete_one({"id": member_id})
    return {"deleted": member_id}


@api_router.post("/members/{member_id}/photo")
async def upload_photo(member_id: str, file: UploadFile = File(...)):
    existing = await db.members.find_one({"id": member_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Member not found")

    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()
    if ext not in MIME_TYPES:
        ext = "jpg"
    content_type = MIME_TYPES.get(ext, "image/jpeg")
    path = f"{APP_NAME}/photos/{member_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 8MB)")

    result = put_object(path, data, content_type)
    await db.members.update_one({"id": member_id}, {"$set": {"photo_path": result["path"]}})
    return {"photo_path": result["path"]}


@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    try:
        data, content_type = get_object(path)
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            raise HTTPException(404, "File not found")
        raise HTTPException(500, "Storage error")
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000"}
    )


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
