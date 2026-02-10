"""Telegram-based authentication for web interface."""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import hashlib
import hmac

from db import get_db
from db.models import User
from config import settings

# JWT settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def verify_telegram_auth(auth_data: dict) -> bool:
    """
    Verify Telegram login widget data.
    
    Args:
        auth_data: Dict with id, first_name, last_name, username, photo_url, auth_date, hash
        
    Returns:
        True if data is valid
    """
    check_hash = auth_data.get('hash')
    if not check_hash:
        return False
    
    # Create data-check-string
    auth_data_copy = auth_data.copy()
    if 'hash' in auth_data_copy:
        del auth_data_copy['hash']
    
    # Filter out None values and ensure all values are strings
    data_check_arr = []
    for k, v in sorted(auth_data_copy.items()):
        if v is not None:
            data_check_arr.append(f"{k}={v}")
            
    data_check_string = "\n".join(data_check_arr)
    
    # Create secret key from bot token
    secret_key = hashlib.sha256(settings.telegram_bot_token.encode()).digest()
    
    # Calculate hash
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Verify hash matches
    if calculated_hash != check_hash:
        return False
    
    # Check auth_date is recent (within 24 hours)
    auth_date = int(auth_data.get('auth_date', 0))
    current_time = datetime.utcnow().timestamp()
    
    if current_time - auth_date > 86400:  # 24 hours
        return False
    
    # Debug logging (can be removed later)
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.info(f"Auth check string: {data_check_string}")
    logger.info(f"Calculated: {calculated_hash}, Received: {check_hash}")
    logger.info(f"Time diff: {current_time - auth_date}")

    return True


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        telegram_id: int = payload.get("telegram_id")
        if telegram_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Verify that current user is an admin.
    
    Raises:
        HTTPException: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise."""
    if not token:
        return None
    
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None
