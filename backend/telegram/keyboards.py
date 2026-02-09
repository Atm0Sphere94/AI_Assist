"""Telegram inline keyboards and reply keyboards."""
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder


def get_main_menu_keyboard() -> ReplyKeyboardMarkup:
    """Get main menu keyboard with primary actions."""
    builder = ReplyKeyboardBuilder()
    builder.row(
        KeyboardButton(text="📝 Новая задача"),
        KeyboardButton(text="📅 Календарь"),
    )
    builder.row(
        KeyboardButton(text="⏰ Напоминание"),
        KeyboardButton(text="🖼️ Генерация картинки"),
    )
    builder.row(
        KeyboardButton(text="📚 База знаний"),
        KeyboardButton(text="📄 Документы"),
    )
    builder.row(
        KeyboardButton(text="⚙️ Настройки"),
    )
    return builder.as_markup(resize_keyboard=True)


def get_task_priority_keyboard() -> InlineKeyboardMarkup:
    """Get keyboard for selecting task priority."""
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🔴 Высокий", callback_data="priority_high"),
        InlineKeyboardButton(text="🟡 Средний", callback_data="priority_medium"),
        InlineKeyboardButton(text="🟢 Низкий", callback_data="priority_low"),
    )
    return builder.as_markup()


def get_task_status_keyboard() -> InlineKeyboardMarkup:
    """Get keyboard for task status changes."""
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="▶️ В работе", callback_data="status_in_progress"),
        InlineKeyboardButton(text="✅ Завершена", callback_data="status_completed"),
    )
    builder.row(
        InlineKeyboardButton(text="❌ Отменена", callback_data="status_cancelled"),
    )
    return builder.as_markup()


def get_confirmation_keyboard(action: str) -> InlineKeyboardMarkup:
    """Get confirmation keyboard for actions."""
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="✅ Да", callback_data=f"confirm_{action}"),
        InlineKeyboardButton(text="❌ Нет", callback_data=f"cancel_{action}"),
    )
    return builder.as_markup()


def get_cancel_keyboard() -> ReplyKeyboardMarkup:
    """Get keyboard with cancel button."""
    builder = ReplyKeyboardBuilder()
    builder.row(KeyboardButton(text="❌ Отмена"))
    return builder.as_markup(resize_keyboard=True)


def get_back_to_menu_keyboard() -> InlineKeyboardMarkup:
    """Get keyboard with back to menu button."""
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="🏠 Главное меню", callback_data="main_menu"))
    return builder.as_markup()
