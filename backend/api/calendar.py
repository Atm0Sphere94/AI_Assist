from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import tempfile
import os

from db import get_db
from db.models import User, CalendarEvent
from auth import get_current_user
from services.calendar_service import CalendarService

router = APIRouter(tags=["calendar"])

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    is_all_day: bool = False

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_all_day: Optional[bool] = None

class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    is_all_day: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[EventResponse])
async def get_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Basic list for now, filtering can be added to service
    query = select(CalendarEvent).where(CalendarEvent.user_id == current_user.id)
    
    # Ensure datetimes are naive for asyncpg/Postgres TIMESTAMP WITHOUT TIME ZONE
    if start_date and start_date.tzinfo:
        start_date = start_date.replace(tzinfo=None)
    if end_date and end_date.tzinfo:
        end_date = end_date.replace(tzinfo=None)
        
    if start_date:
        query = query.where(CalendarEvent.start_time >= start_date)
    if end_date:
        query = query.where(CalendarEvent.start_time <= end_date)
    query = query.order_by(CalendarEvent.start_time)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=EventResponse)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Ensure datetimes are naive
    start_time = event_data.start_time
    if start_time.tzinfo:
        start_time = start_time.replace(tzinfo=None)
        
    end_time = event_data.end_time
    if end_time and end_time.tzinfo:
        end_time = end_time.replace(tzinfo=None)

    event = CalendarEvent(
        user_id=current_user.id,
        title=event_data.title,
        description=event_data.description,
        start_time=start_time,
        end_time=end_time,
        is_all_day=event_data.is_all_day
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event

@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(CalendarEvent).where(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id))
    event = result.scalar_one_or_none()
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.delete(event)
    await db.commit()
    return {"message": "Event deleted"}


@router.post("/import")
async def import_ical(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Import calendar events from .ics file."""
    if not file.filename.endswith('.ics'):
        raise HTTPException(status_code=400, detail="Only .ics files are supported")
    
    try:
        from icalendar import Calendar
        
        # Read file content
        content = await file.read()
        
        # Parse iCal
        cal = Calendar.from_ical(content)
        
        imported_count = 0
        skipped_count = 0
        
        for component in cal.walk():
            if component.name == "VEVENT":
                try:
                    title = str(component.get('summary', 'Untitled Event'))
                    description = str(component.get('description', ''))
                    start = component.get('dtstart').dt
                    end = component.get('dtend')
                    
                    # Handle datetime/date types
                    if hasattr(start, 'hour'):
                        start_time = start
                        is_all_day = False
                    else:
                        # Date only - all day event
                        start_time = datetime.combine(start, datetime.min.time())
                        is_all_day = True
                    
                    end_time = None
                    if end:
                        end_dt = end.dt
                        if hasattr(end_dt, 'hour'):
                            end_time = end_dt
                        else:
                            end_time = datetime.combine(end_dt, datetime.min.time())
                    
                    # Create event
                    event = CalendarEvent(
                        user_id=current_user.id,
                        title=title,
                        description=description if description else None,
                        start_time=start_time,
                        end_time=end_time,
                        is_all_day=is_all_day
                    )
                    db.add(event)
                    imported_count += 1
                    
                except Exception as e:
                    skipped_count += 1
                    continue
        
        await db.commit()
        
        return {
            "message": f"Import completed",
            "imported": imported_count,
            "skipped": skipped_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
