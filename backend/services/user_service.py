from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import User
from typing import Optional

async def get_or_create_user(session: AsyncSession, telegram_id: int, user_data: dict = None) -> User:
    """
    Get user by telegram_id or create if not exists.
    
    Args:
        session: Database session
        telegram_id: Telegram User ID
        user_data: Dictionary with username, first_name, last_name, language_code
        
    Returns:
        User object
    """
    # Try to find existing user
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    
    # Create new if not found
    if not user:
        user_data = user_data or {}
        user = User(
            telegram_id=telegram_id,
            username=user_data.get("username"),
            first_name=user_data.get("first_name"),
            last_name=user_data.get("last_name"),
            language_code=user_data.get("language_code", "en")
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
    return user
