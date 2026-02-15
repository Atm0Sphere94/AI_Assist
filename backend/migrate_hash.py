import asyncio
from sqlalchemy import text
from db.session import async_session_factory

async def migrate():
    async with async_session_factory() as session:
        print("Starting migration: Adding file_hash to documents...")
        
        try:
            # Add file_hash column
            await session.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);"))
            await session.execute(text("CREATE INDEX IF NOT EXISTS ix_documents_file_hash ON documents (file_hash);"))
            print("Added file_hash column and index.")
            
        except Exception as e:
            print(f"Error during migration: {e}")
            
        await session.commit()
        print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate())
