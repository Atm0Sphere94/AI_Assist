"""Initialize database with pgvector extension."""
import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine
from db.models import Base
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def init_database():
    """Initialize database tables and extensions."""
    logger.info("Initializing database...")
    
    engine = create_async_engine(settings.database_url, echo=True)
    
    async with engine.begin() as conn:
        # Create pgvector extension
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        logger.info("pgvector extension created")
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        logger.info("All tables created")
    
    await engine.dispose()
    logger.info("Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(init_database())
