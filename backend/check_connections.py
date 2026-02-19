import asyncio
import sys
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from redis.asyncio import Redis
from qdrant_client import QdrantClient
from config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ConnectionCheck")

async def check_postgres():
    try:
        engine = create_async_engine(settings.database_url)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("✅ Postgres connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Postgres connection failed: {e}")
        return False

async def check_redis():
    try:
        redis = Redis.from_url(settings.redis_url)
        await redis.ping()
        await redis.close()
        logger.info("✅ Redis connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        return False

def check_qdrant():
    try:
        # Qdrant client is sync by default usually, or we use REST
        # Using the client from qdrant_client
        client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
        collections = client.get_collections()
        logger.info(f"✅ Qdrant connection successful. Collections: {len(collections.collections)}")
        return True
    except Exception as e:
        logger.error(f"❌ Qdrant connection failed: {e}")
        return False

async def main():
    logger.info("Starting connection checks...")
    results = await asyncio.gather(
        check_postgres(),
        check_redis()
    )
    qdrant_result = check_qdrant()
    
    if all(results) and qdrant_result:
        logger.info("🎉 All connections verified!")
        sys.exit(0)
    else:
        logger.error("⚠️ Some connections failed.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
