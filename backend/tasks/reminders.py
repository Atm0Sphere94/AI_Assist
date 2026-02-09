import asyncio
import logging
from datetime import datetime
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from celery_app import celery_app
from db.session import async_session_factory
from db.models import Reminder, User
from telegram.bot import bot

logger = logging.getLogger(__name__)

async def process_reminders():
    """Async logic to check and send reminders."""
    async with async_session_factory() as session:
        now = datetime.now()
        logger.info(f"Checking reminders at {now}...")
        
        # Join User to get telegram_id
        query = select(Reminder).options(selectinload(Reminder.user)).where(
            and_(
                Reminder.is_sent == False,
                Reminder.remind_at <= now
            )
        )
        
        result = await session.execute(query)
        reminders = result.scalars().all()
        
        if not reminders:
            logger.info("No pending reminders found.")
            return

        logger.info(f"Found {len(reminders)} pending reminders.")
        
        for reminder in reminders:
            try:
                user_telegram_id = reminder.user.telegram_id
                logger.info(f"Sending reminder {reminder.id} to user {user_telegram_id}")
                
                message_text = (
                    f"⏰ <b>Напоминание!</b>\n\n"
                    f"📌 <b>{reminder.title}</b>\n"
                )
                if reminder.message:
                    message_text += f"📝 {reminder.message}\n"
                
                # Send telegram message
                await bot.send_message(
                    chat_id=user_telegram_id,
                    text=message_text,
                    parse_mode="HTML"
                )
                
                # Mark as sent
                reminder.is_sent = True
                reminder.sent_at = datetime.now()
                session.add(reminder)
                
            except Exception as e:
                logger.error(f"Failed to process reminder {reminder.id}: {e}", exc_info=True)
        
        await session.commit()

@celery_app.task(name="tasks.check_reminders")
def check_reminders():
    """
    Celery task to check for reminders.
    Runs every minute.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        loop.run_until_complete(process_reminders())
        return "Reminders processed"
    except RuntimeError:
        # If loop is already running (unlikely for Celery worker but possible)
        asyncio.run(process_reminders())
        return "Reminders processed (new loop)"
    except Exception as e:
        logger.error(f"Error in check_reminders task: {e}", exc_info=True)
        return f"Error: {e}"
