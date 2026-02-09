from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from db.models import Reminder, CalendarEvent
from typing import Optional

class ReminderService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_reminder(self, user_id: int, title: string, remind_at: datetime, message: Optional[str] = None):
        reminder = Reminder(
            user_id=user_id,
            title=title,
            message=message,
            remind_at=remind_at,
            is_sent=False
        )
        self.session.add(reminder)
        await self.session.commit()
        await self.session.refresh(reminder)
        return reminder

    async def get_user_reminders(self, user_id: int):
        result = await self.session.execute(
            select(Reminder).where(Reminder.user_id == user_id).order_by(Reminder.remind_at)
        )
        return result.scalars().all()
