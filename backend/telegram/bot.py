"""Telegram bot initialization and setup."""
import logging
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.redis import RedisStorage
from redis.asyncio import Redis
from config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize bot with default parse mode
bot = Bot(
    token=settings.telegram_bot_token,
    default=DefaultBotProperties(parse_mode=ParseMode.HTML)
)

# Initialize Redis storage for FSM
redis = Redis.from_url(settings.redis_url)
storage = RedisStorage(redis=redis)

# Initialize dispatcher
dp = Dispatcher(storage=storage)


async def setup_webhook():
    """Set up webhook for Telegram bot."""
    if settings.telegram_webhook_url:
        webhook_info = await bot.get_webhook_info()
        if webhook_info.url != settings.telegram_webhook_url:
            await bot.set_webhook(
                url=settings.telegram_webhook_url,
                secret_token=settings.telegram_webhook_secret,
            )
            logger.info(f"Webhook set to: {settings.telegram_webhook_url}")
        else:
            logger.info("Webhook already configured")
    else:
        logger.warning("Webhook URL not configured, bot will use long polling")


async def remove_webhook():
    """Remove webhook (for development with long polling)."""
    await bot.delete_webhook()
    logger.info("Webhook removed")


# Global task for polling
_polling_task = None


async def on_startup():
    """Execute on bot startup."""
    global _polling_task
    
    await setup_webhook()
    
    # Start polling in background if webhook not configured
    if not settings.telegram_webhook_url:
        import asyncio
        _polling_task = asyncio.create_task(dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types()))
        logger.info("Started polling in background")
    
    logger.info("Bot started successfully")


async def on_shutdown():
    """Execute on bot shutdown."""
    global _polling_task
    
    # Stop polling if running
    if _polling_task:
        _polling_task.cancel()
        try:
            await _polling_task
        except asyncio.CancelledError:
            pass
        logger.info("Polling stopped")
    
    await bot.session.close()
    await redis.close()
    logger.info("Bot shut down")
