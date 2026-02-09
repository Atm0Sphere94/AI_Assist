from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from ..db.models import CalendarEvent, Reminder
from typing import Optional

class CalendarService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_event(self, user_id: int, title: str, start_time: datetime, end_time: Optional[datetime] = None, description: Optional[str] = None):
        event = CalendarEvent(
            user_id=user_id,
            title=title,
            description=description,
            start_time=start_time,
            end_time=end_time
        )
        self.session.add(event)
        await self.session.commit()
        await self.session.refresh(event)
        return event

    async def get_user_events(self, user_id: int):
        result = await self.session.execute(
            select(CalendarEvent).where(CalendarEvent.user_id == user_id).order_by(CalendarEvent.start_time)
        )
        return result.scalars().all()
