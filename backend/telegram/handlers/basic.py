"""Basic command handlers for Telegram bot."""
import logging
from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message
from aiogram.fsm.context import FSMContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db, User
from telegram.keyboards import get_main_menu_keyboard, get_back_to_menu_keyboard
from telegram.states import MainStates

logger = logging.getLogger(__name__)
router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    """Handle /start command."""
    # Get or create user in database
    async for db in get_db():
        result = await db.execute(
            select(User).where(User.telegram_id == message.from_user.id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                telegram_id=message.from_user.id,
                username=message.from_user.username,
                first_name=message.from_user.first_name,
                last_name=message.from_user.last_name,
                language_code=message.from_user.language_code,
            )
            db.add(user)
            await db.commit()
            logger.info(f"New user registered: {user.telegram_id}")
    
    await state.set_state(MainStates.idle)
    
    welcome_text = (
        f"👋 Привет, {message.from_user.first_name}!\n\n"
        "Я AI Ассистент Jarvis - ваш персональный помощник.\n\n"
        "Я могу помочь вам с:\n"
        "📝 Управлением задачами и списками дел\n"
        "📅 Ведением календаря и событий\n"
        "⏰ Напоминаниями\n"
        "🖼️ Генерацией изображений\n"
        "📚 Хранением и поиском в базе знаний\n"
        "📄 Обработкой документов\n\n"
        "Просто напишите мне что-нибудь, и я пойму, что вам нужно! 🚀\n"
        "Или используйте меню ниже для быстрого доступа."
    )
    
    await message.answer(
        welcome_text,
        reply_markup=get_main_menu_keyboard()
    )


@router.message(Command("help"))
async def cmd_help(message: Message):
    """Handle /help command."""
    help_text = (
        "<b>📖 Справка по командам:</b>\n\n"
        "/start - Начать работу с ботом\n"
        "/help - Показать эту справку\n"
        "/menu - Показать главное меню\n\n"
        "<b>🎯 Примеры запросов:</b>\n\n"
        "📝 <i>\"Создай задачу: купить молоко\"</i>\n"
        "📅 <i>\"Добавь встречу завтра в 15:00 с клиентом\"</i>\n"
        "⏰ <i>\"Напомни мне через час позвонить маме\"</i>\n"
        "🖼️ <i>\"Нарисуй кота в космосе\"</i>\n"
        "📚 <i>\"Найди информацию о Python в моих документах\"</i>\n\n"
        "Просто пишите естественным языком, и я пойму! 💡"
    )
    
    await message.answer(help_text)


@router.message(Command("menu"))
async def cmd_menu(message: Message, state: FSMContext):
    """Handle /menu command."""
    await state.set_state(MainStates.idle)
    await message.answer(
        "🏠 Главное меню:",
        reply_markup=get_main_menu_keyboard()
    )


@router.message(F.text == "⚙️ Настройки")
async def settings_handler(message: Message):
    """Handle settings button."""
    settings_text = (
        "<b>⚙️ Настройки</b>\n\n"
        "Язык: 🇷🇺 Русский\n"
        "Часовой пояс: UTC+3\n"
        "Уведомления: ✅ Включены\n\n"
        "Для изменения настроек используйте веб-интерфейс."
    )
    
    await message.answer(
        settings_text,
        reply_markup=get_back_to_menu_keyboard()
    )


@router.message(F.text == "❌ Отмена")
async def cancel_handler(message: Message, state: FSMContext):
    """Handle cancel button."""
    await state.set_state(MainStates.idle)
    await message.answer(
        "❌ Действие отменено.",
        reply_markup=get_main_menu_keyboard()
    )
