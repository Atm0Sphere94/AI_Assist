"""Celery application for background tasks."""
from celery import Celery
from celery.schedules import crontab
from config import settings

# Create Celery app
celery_app = Celery(
    "jarvis",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    task_soft_time_limit=3000,  # 50 minutes
)

# Periodic tasks schedule
celery_app.conf.beat_schedule = {
    'check-reminders': {
        'task': 'tasks.check_reminders',
        'schedule': crontab(minute='*'),  # Every minute
    },
    'auto-sync-cloud-storage': {
        'task': 'cloud.schedule_auto_sync',
        'schedule': crontab(minute=0),  # Every hour
    },
}

# Auto-discover tasks
celery_app.autodiscover_tasks(['tasks', 'tasks.cloud_sync_tasks', 'tasks.reminders'])
