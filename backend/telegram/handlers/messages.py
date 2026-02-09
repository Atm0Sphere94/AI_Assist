"""Message handler that uses agentic workflow to process user messages."""
import logging
from aiogram import Router, F
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

from agents.workflow import process_message
from telegram.states import MainStates
from telegram.keyboards import get_main_menu_keyboard

logger = logging.getLogger(__name__)
router = Router()


@router.message(MainStates.idle, F.text)
@router.message(F.text & ~F.text.startswith("/") & ~F.text.in_([
    "📝 Новая задача", "📅 Календарь", "⏰ Напоминание", 
    "🖼️ Генерация картинки", "📚 База знаний", "📄 Документы", 
    "⚙️ Настройки", "❌ Отмена"
]))
async def message_handler(message: Message, state: FSMContext):
    """
    Handle incoming text messages using agentic workflow.
    Routes messages through LangGraph for intelligent processing.
    """
    user_id = message.from_user.id
    user_message = message.text
    
    # Show typing indicator
    await message.bot.send_chat_action(message.chat.id, "typing")
    
    try:
        # Get current FSM state data for context
        state_data = await state.get_data()
        context = {
            "chat_id": message.chat.id,
            "username": message.from_user.username,
            "first_name": message.from_user.first_name,
            **state_data
        }
        
        # Process message through agentic workflow
        response = await process_message(
            user_id=user_id,
            message=user_message,
            context=context
        )
        
        # Send response
        await message.answer(response)
        
    except Exception as e:
        logger.error(f"Error handling message: {e}", exc_info=True)
        await message.answer(
            "😔 Извините, произошла ошибка при обработке вашего сообщения. "
            "Попробуйте ещё раз или используйте меню.",
            reply_markup=get_main_menu_keyboard()
        )
