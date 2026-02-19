from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from db import get_db
from db.models import User
from auth import get_current_user

router = APIRouter(tags=["settings"])

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    language_code: Optional[str] = None
    settings: Optional[dict] = None

class UserProfileResponse(BaseModel):
    id: int
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    language_code: Optional[str]
    is_admin: bool
    settings: Optional[dict] = None

@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if profile_data.first_name is not None:
        current_user.first_name = profile_data.first_name
    if profile_data.last_name is not None:
        current_user.last_name = profile_data.last_name
    if profile_data.username is not None:
        current_user.username = profile_data.username
    if profile_data.language_code is not None:
        current_user.language_code = profile_data.language_code
    if profile_data.settings is not None:
        # Merge or replace settings? Let's replace top-level keys but keep others if we want partial updates.
        # But for now, simple replacement or merge if it's a dict.
        # Actually, simpler to just overwrite if provided, client handles state.
        # But to be safe let's ensure it's a dict.
        current_settings = dict(current_user.settings) if current_user.settings else {}
        current_settings.update(profile_data.settings)
        current_user.settings = current_settings
    
    await db.commit()
    await db.refresh(current_user)
    return current_user
