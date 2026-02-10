"""Main FastAPI application."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from aiogram.types import Update

from config import settings
from db import init_db
from telegram.bot import bot, dp, on_startup, on_shutdown
from telegram.handlers import basic, messages

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("Starting AI Jarvis application...")
    await init_db()
    logger.info("Database initialized")
    
    # Register Telegram handlers
    dp.include_router(basic.router)
    dp.include_router(messages.router)
    from telegram.handlers import documents
    dp.include_router(documents.router)
    logger.info("Telegram handlers registered")
    
    await on_startup()
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Jarvis application...")
    await on_shutdown()


# Create FastAPI application
app = FastAPI(
    title="AI Jarvis API",
    description="Telegram AI RAG Assistant with Agentic Workflow",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI Jarvis API",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/webhook/tg")
async def telegram_webhook(request: Request):
    """
    Telegram webhook endpoint.
    Receives updates from Telegram and processes them.
    """
    # Verify webhook secret if configured
    if settings.telegram_webhook_secret:
        secret_header = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
        if secret_header != settings.telegram_webhook_secret:
            logger.warning("Invalid webhook secret")
            return Response(status_code=403)
    
    # Get update data
    update_data = await request.json()
    
    try:
        # Process update
        update = Update(**update_data)
        await dp.feed_update(bot, update)
        return Response(status_code=200)
    except Exception as e:
        logger.error(f"Error processing update: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"}
        )


# Include API routers (will be added later)
# from api import tasks, calendar, documents, knowledge, chat
# app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
# app.include_router(calendar.router, prefix="/api/calendar", tags=["calendar"])
# app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
# app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])
# app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

# Cloud storage routers
from api.cloud_storage import router as cloud_storage_router
from api.obsidian import router as obsidian_router
from api.auth import router as auth_router
from api.chat import router as chat_router
from api.settings import router as settings_router
from api.tasks import router as tasks_router
from api.calendar import router as calendar_router
from api.documents import router as documents_router
from api.knowledge import router as knowledge_router

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(settings_router, prefix="/api/settings")
app.include_router(tasks_router, prefix="/api/tasks")
app.include_router(calendar_router, prefix="/api/calendar")
app.include_router(documents_router, prefix="/api/documents")
app.include_router(knowledge_router, prefix="/api/knowledge")
app.include_router(cloud_storage_router)
app.include_router(obsidian_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
