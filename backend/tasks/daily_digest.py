import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from celery import shared_task
from db.session import async_session_factory
from db.models import User, Task, CalendarEvent
from telegram.bot import bot
from config import settings
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)

# Initialize LLM based on configuration
def get_llm():
    """Get LLM instance based on settings."""
    if settings.use_ollama:
        from langchain_community.llms import Ollama
        return Ollama(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            temperature=0.7,
        )
    else:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.openai_model,
            temperature=0.7,
            api_key=settings.openai_api_key
        )

llm = get_llm()

async def process_daily_digest():
    """Async logic to generate and send daily digests to all users."""
    async with async_session_factory() as session:
        # Fetch users who have interacted via Telegram
        users_query = select(User).where(User.telegram_id.isnot(None))
        result = await session.execute(users_query)
        users = result.scalars().all()
        
        if not users:
            logger.info("No users with telegram_id found for daily digest.")
            return

        # Prepare timezone bounds (assuming User timezone is UTC+3 roughly for now, but querying specifically for "today" in UTC bounds)
        # To be safe and since events/tasks are stored in UTC, we will fetch bounds for the next 24 hours.
        utc_now = datetime.utcnow()
        utc_tomorrow = utc_now + timedelta(days=1)
        
        logger.info(f"Generating daily digest for {len(users)} users.")
        
        for user in users:
            try:
                # Fetch pending tasks due today or overdue
                tasks_query = select(Task).where(
                    and_(
                        Task.user_id == user.id,
                        Task.status.in_(["pending", "in_progress"]),
                        Task.due_date <= utc_tomorrow
                    )
                ).order_by(Task.due_date)
                
                tasks_result = await session.execute(tasks_query)
                tasks = tasks_result.scalars().all()
                
                # Fetch events starting within the next 24 hours
                events_query = select(CalendarEvent).where(
                    and_(
                        CalendarEvent.user_id == user.id,
                        CalendarEvent.start_time >= utc_now,
                        CalendarEvent.start_time <= utc_tomorrow
                    )
                ).order_by(CalendarEvent.start_time)
                
                events_result = await session.execute(events_query)
                events = events_result.scalars().all()
                
                if not tasks and not events:
                    logger.info(f"User {user.telegram_id} has no tasks or events today. Skipping digest.")
                    continue
                
                # Format schedule for LLM
                schedule_text = "Планы на сегодня:\n\n"
                
                if events:
                    schedule_text += "📅 Встречи и события:\n"
                    for event in events:
                        time_str = event.start_time.strftime("%H:%M")
                        schedule_text += f"- {time_str}: {event.title}\n"
                    schedule_text += "\n"
                
                if tasks:
                    schedule_text += "✅ Задачи (срочные и на сегодня):\n"
                    for task in tasks:
                        schedule_text += f"- {task.title} (Приоритет: {task.priority})\n"
                
                # Prompt the LLM to generate the greeting
                system_prompt = f"""Ты Джарвис, дружелюбный и проактивный ИИ-ассистент. 
Твоя задача — написать доброе утреннее сообщение для пользователя.
Используй предоставленное расписание на день, чтобы кратко подвести итоги и замотивировать пользователя.
Сделай сообщение персональным, эмпатичным и не слишком длинным.
Используй эмодзи.

Расписание пользователя:
{schedule_text}"""

                llm_response = await llm.ainvoke([SystemMessage(content=system_prompt)])
                message_text = llm_response.content
                
                # Send telegram message
                await bot.send_message(
                    chat_id=user.telegram_id,
                    text=message_text,
                    parse_mode="HTML"
                )
                logger.info(f"Successfully sent daily digest to user {user.telegram_id}")
                
            except Exception as e:
                logger.error(f"Failed to process daily digest for user {user.id}: {e}", exc_info=True)


@shared_task(name="tasks.send_daily_digest")
def send_daily_digest():
    """
    Celery task to send daily morning digest.
    Scheduled to run daily at 06:00 UTC (09:00 MSK).
    """
    logger.info("Starting send_daily_digest celery task...")
    try:
        asyncio.run(process_daily_digest())
        return "Daily digest processed"
    except Exception as e:
        logger.error(f"Error in send_daily_digest task: {e}", exc_info=True)
        return f"Error: {e}"
