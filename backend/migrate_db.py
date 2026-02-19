import asyncio
from sqlalchemy import text
from db.session import async_session_factory

async def migrate():
    async with async_session_factory() as session:
        print("Starting migration...")
        
        # 1. Create folders table
        print("Creating folders table...")
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS folders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                parent_id INTEGER REFERENCES folders(id),
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc'),
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc')
            );
        """))
        
        # 2. Add folder_id to documents
        print("Adding folder_id to documents...")
        try:
            await session.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES folders(id);"))
        except Exception as e:
            print(f"Notice (documents): {e}")

        # 3. Add settings column to users
        print("Adding settings column to users...")
        try:
            # Check if column exists first to avoid error block if possible, or just use IF NOT EXISTS if PG supports it (PG 9.6+ does)
            # SQLAlchemy text() passes through to DB.
            await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSON DEFAULT '{}'::json;"))
        except Exception as e:
            print(f"Notice (users settings): {e}")
            
        await session.commit()
        print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
