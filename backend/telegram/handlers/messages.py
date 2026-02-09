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


@router.message(F.document)
async def document_handler(message: Message, state: FSMContext):
    """Handle incoming documents."""
    user_id = message.from_user.id
    document = message.document
    
    # Show upload action
    await message.bot.send_chat_action(message.chat.id, "upload_document")
    
    try:
        # Create upload directory if not exists
        import os
        from config import settings
        os.makedirs(settings.upload_dir, exist_ok=True)
        
        # Determine file path
        # Use document.file_name or generate one if missing
        filename = document.file_name or f"doc_{document.file_id}"
        file_path = os.path.join(settings.upload_dir, f"{user_id}_{filename}")
        
        # Download file
        bot = message.bot
        file = None
        import asyncio
        
        # Retry mechanism for get_file
        for attempt in range(3):
            try:
                file = await bot.get_file(document.file_id, request_timeout=60)
                break
            except Exception as e:
                if attempt == 2:
                    logger.error(f"Failed to get file info after 3 attempts: {e}")
                    raise e
                await asyncio.sleep(1)
        
        # Download with timeout
        if file:
            await bot.download_file(file.file_path, file_path, timeout=60)
        
        # Prepare context with file info
        state_data = await state.get_data()
        context = {
            "chat_id": message.chat.id,
            "username": message.from_user.username,
            "first_name": message.from_user.first_name,
            "file_path": file_path,
            "file_name": filename,
            "mime_type": document.mime_type,
            "file_size": document.file_size,
            **state_data
        }
        
        # Process through workflow with "document" intent hint
        response = await process_message(
            user_id=user_id,
            message=f"Upload document: {filename}",  # Synthetic message to trigger classification
            context=context
        )
        
        await message.answer(response)
        
    except Exception as e:
        logger.error(f"Error handling document: {e}", exc_info=True)
        await message.answer("❌ Ошибка при загрузке документа.")
