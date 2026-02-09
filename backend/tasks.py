"""Celery tasks for background processing."""
import logging
from datetime import datetime
from celery_app import celery_app
from telegram.bot import bot

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.check_reminders")
def check_reminders():
    """
    Check for reminders that need to be sent.
    Runs every minute via Celery Beat.
    """
    # This will be implemented when we add reminder service
    logger.info("Checking reminders...")
    return "Reminders checked"


@celery_app.task(name="tasks.send_reminder")
async def send_reminder(telegram_id: int, reminder_text: str):
    """
    Send a reminder to a user via Telegram.
    
    Args:
        telegram_id: User's Telegram ID
        reminder_text: Reminder message
    """
    try:
        await bot.send_message(
            chat_id=telegram_id,
            text=f"⏰ <b>Напоминание:</b>\n\n{reminder_text}",
            parse_mode="HTML"
        )
        logger.info(f"Reminder sent to user {telegram_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send reminder: {e}", exc_info=True)
        return False


@celery_app.task(name="tasks.process_document")
def process_document(document_id: int):
    """
    Process an uploaded document for indexing.
    
    Args:
        document_id: Database ID of the document
    """
    # This will be implemented with document service
    logger.info(f"Processing document {document_id}...")
    return f"Document {document_id} processed"


@celery_app.task(name="tasks.generate_image")
async def generate_image(user_id: int, prompt: str):
    """
    Generate an image using AI.
    
    Args:
        user_id: User ID
        prompt: Image generation prompt
    """
    # This will be implemented with image generation service
    logger.info(f"Generating image for user {user_id}: {prompt}")
    return "Image generated"
