from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from db.models import Task, TaskList
from typing import Optional

class TaskService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_task(self, user_id: int, title: str, 
                         description: Optional[str] = None, 
                         due_date: Optional[datetime] = None,
                         priority: str = "medium"):
        task = Task(
            user_id=user_id,
            title=title,
            description=description,
            priority=priority,
            due_date=due_date,
            status="pending"
        )
        self.session.add(task)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def get_user_tasks(self, user_id: int):
        result = await self.session.execute(
            select(Task).where(Task.user_id == user_id).order_by(Task.created_at.desc())
        )
        return result.scalars().all()
