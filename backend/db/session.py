import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import text
from typing import AsyncGenerator
from config import settings

# Determine if running in Celery worker
IS_CELERY = "celery" in sys.argv[0] or (len(sys.argv) > 1 and "celery" in sys.argv[1])

# Create async engine
# Use NullPool for Celery to avoid fork-safety issues with asyncpg
pool_class = NullPool if (settings.debug or IS_CELERY) else None

# Pool parameters are incompatible with NullPool
engine_kwargs = {
    "echo": settings.debug,
    "poolclass": pool_class,
}

# Only add pool parameters if NOT using NullPool
if pool_class is None:
    engine_kwargs["pool_size"] = settings.database_pool_size
    engine_kwargs["max_overflow"] = settings.database_max_overflow

engine = create_async_engine(
    settings.database_url,
    **engine_kwargs
)

# Create session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database session.
    
    Usage in FastAPI:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    from db.models import Base
    
    async with engine.begin() as conn:
        # Create pgvector extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
