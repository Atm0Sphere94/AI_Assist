"""Admin user creation script."""
import asyncio
from sqlalchemy import select
from db.session import async_session_factory
from db.models import User


async def create_admin_user(telegram_id: int):
    """Create or update user to be admin."""
    async with async_session_factory() as db:
        # Check if user exists
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            user.is_admin = True
            print(f"✅ User {user.first_name} ({user.telegram_id}) is now admin")
        else:
            print(f"❌ User with Telegram ID {telegram_id} not found")
            print("   User must login via Telegram first")
            return
        
        await db.commit()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python create_admin.py <telegram_id>")
        print("Example: python create_admin.py 123456789")
        sys.exit(1)
    
    telegram_id = int(sys.argv[1])
    asyncio.run(create_admin_user(telegram_id))
