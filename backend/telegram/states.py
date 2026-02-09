"""FSM states for Telegram bot conversations."""
from aiogram.fsm.state import State, StatesGroup


class MainStates(StatesGroup):
    """Main conversation states."""
    idle = State()
    waiting_for_message = State()
    processing = State()


class TaskStates(StatesGroup):
    """States for task creation flow."""
    waiting_for_title = State()
    waiting_for_description = State()
    waiting_for_due_date = State()
    waiting_for_priority = State()


class CalendarStates(StatesGroup):
    """States for calendar event creation."""
    waiting_for_title = State()
    waiting_for_description = State()
    waiting_for_date = State()
    waiting_for_time = State()
    waiting_for_duration = State()


class ReminderStates(StatesGroup):
    """States for reminder creation."""
    waiting_for_message = State()
    waiting_for_datetime = State()


class DocumentStates(StatesGroup):
    """States for document upload and processing."""
    waiting_for_document = State()
    waiting_for_description = State()
    processing_document = State()


class KnowledgeStates(StatesGroup):
    """States for knowledge base queries."""
    waiting_for_query = State()
    showing_results = State()


class ImageGenerationStates(StatesGroup):
    """States for image generation."""
    waiting_for_prompt = State()
    generating = State()
