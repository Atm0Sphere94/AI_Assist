"""Create admin user with username and password."""
import asyncio
import sys
from passlib.context import CryptContext
from sqlalchemy import select
from db.session import async_session_factory
from db.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin_user(username: str, password: str, telegram_id: int = None):
    """Create admin user with username and password."""
    async with async_session_factory() as db:
        # Check if admin username already exists
        result = await db.execute(
            select(User).where(User.admin_username == username)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"❌ Admin user '{username}' already exists!")
            return False
        
        # Hash password
        password_hash = pwd_context.hash(password)
        
        # Create new admin user
        admin = User(
            admin_username=username,
            admin_password_hash=password_hash,
            telegram_id=telegram_id,
            first_name="Admin",
            is_admin=True,
            is_active=True
        )
        
        db.add(admin)
        await db.commit()
        
        print(f"✅ Admin user '{username}' created successfully!")
        print(f"   Login: {username}")
        print(f"   Role: Administrator")
        if telegram_id:
            print(f"   Telegram ID: {telegram_id}")
        
        return True


async def update_telegram_user_to_admin(telegram_id: int, username: str, password: str):
    """Update existing Telegram user to admin with web credentials."""
    async with async_session_factory() as db:
        # Find user by Telegram ID
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User with Telegram ID {telegram_id} not found")
            print("   User must login via Telegram first")
            return False
        
        # Check if username is taken
        result = await db.execute(
            select(User).where(User.admin_username == username)
        )
        if result.scalar_one_or_none():
            print(f"❌ Username '{username}' is already taken!")
            return False
        
        # Update user
        user.admin_username = username
        user.admin_password_hash = pwd_context.hash(password)
        user.is_admin = True
        
        await db.commit()
        
        print(f"✅ User {user.first_name} ({telegram_id}) is now admin")
        print(f"   Username: {username}")
        print(f"   Can login via Telegram or web interface")
        
        return True


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:")
        print("  Create new admin:")
        print("    python create_admin_user.py <username> <password> [telegram_id]")
        print("")
        print("  Update Telegram user to admin:")
        print("    python create_admin_user.py <username> <password> --telegram <telegram_id>")
        print("")
        print("Example:")
        print("    python create_admin_user.py admin MySecurePassword123")
        print("    python create_admin_user.py admin MySecurePassword123 --telegram 123456789")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    
    # Check if --telegram flag is used
    if len(sys.argv) > 3 and sys.argv[3] == "--telegram":
        if len(sys.argv) < 5:
            print("❌ Telegram ID is required after --telegram flag")
            sys.exit(1)
        telegram_id = int(sys.argv[4])
        asyncio.run(update_telegram_user_to_admin(telegram_id, username, password))
    elif len(sys.argv) > 3:
        telegram_id = int(sys.argv[3])
        asyncio.run(create_admin_user(username, password, telegram_id))
    else:
        asyncio.run(create_admin_user(username, password))
