"""Authentication API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from passlib.context import CryptContext

from db import get_db
from db.models import User
from auth import create_access_token, verify_telegram_auth, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class TelegramAuthData(BaseModel):
    """Telegram Login Widget data."""
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """User profile response."""
    id: int
    telegram_id: int
    username: Optional[str]
    first_name: str
    last_name: Optional[str]
    is_admin: bool
    created_at: str
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Authentication response with token and user."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/telegram/login", response_model=TokenResponse)
async def telegram_login(
    auth_data: TelegramAuthData,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user via Telegram Login Widget.
    
    Verifies Telegram auth data and creates/updates user, then returns JWT token.
    """
    # Verify Telegram auth
    auth_dict = auth_data.model_dump()
    if not verify_telegram_auth(auth_dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram authentication data"
        )
    
    # Find or create user
    result = await db.execute(
        select(User).where(User.telegram_id == auth_data.id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user
        user = User(
            telegram_id=auth_data.id,
            username=auth_data.username,
            first_name=auth_data.first_name,
            last_name=auth_data.last_name,
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update user info
        user.username = auth_data.username
        user.first_name = auth_data.first_name
        user.last_name = auth_data.last_name
        user.last_active_at = auth_data.auth_date
        await db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={"telegram_id": user.telegram_id, "user_id": user.id}
    )
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "telegram_id": user.telegram_id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_admin": user.is_admin
        }
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information."""
    return UserResponse(
        id=current_user.id,
        telegram_id=current_user.telegram_id,
        username=current_user.username or current_user.admin_username,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_admin=current_user.is_admin
    )


class AdminLoginRequest(BaseModel):
    """Admin login request."""
    username: str
    password: str


@router.post("/admin/login", response_model=AuthResponse)
async def admin_login(
    request: AdminLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Admin login with username and password.
    
    Alternative to Telegram auth for admin users.
    """
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Find user by admin username
    result = await db.execute(
        select(User).where(User.admin_username == request.username)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Verify password
    if not user.admin_password_hash or not pwd_context.verify(
        request.password, user.admin_password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    # Check if user is admin
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Generate JWT token
    token = create_access_token(
        data={
            "sub": str(user.id),
            "telegram_id": user.telegram_id,
            "is_admin": user.is_admin
        }
    )
    
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            telegram_id=user.telegram_id,
            username=user.admin_username,
            first_name=user.first_name,
            last_name=user.last_name,
            is_admin=user.is_admin
        )
    )


@router.post("/logout")
async def logout():
    """
    Logout user.
    
    Note: With JWT, logout is handled client-side by removing the token.
    This endpoint exists for consistency.
    """
    return {"message": "Logged out successfully"}
