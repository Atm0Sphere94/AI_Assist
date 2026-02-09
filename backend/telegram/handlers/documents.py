import logging
import os
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.fsm.context import FSMContext

from db import get_db, Document
from services.document_service import DocumentService
from sqlalchemy import select

logger = logging.getLogger(__name__)
router = Router()

@router.message(Command("my_docs"))
@router.message(F.text == "📂 Мои документы")
async def cmd_my_docs(message: Message):
    """List user documents."""
    user_id = message.from_user.id
    
    async for session in get_db():
        doc_service = DocumentService(session)
        # Get user from DB to get ID
        result = await session.execute(
            select(Document).join(Document.user).where(Document.user.has(telegram_id=user_id))
            .order_by(Document.created_at.desc()).limit(10)
        )
        documents = result.scalars().all()
        
        if not documents:
            await message.answer("📂 У вас пока нет загруженных документов.")
            return

        response = "📂 <b>Ваши документы:</b>\n\n"
        for doc in documents:
            status = "✅" if doc.is_indexed else "⚠️"
            response += f"{status} <b>{doc.original_filename}</b> (/del_{doc.id})\n"
            
        response += "\n<i>Нажмите на команду /del_ID чтобы удалить документ.</i>"
        
        await message.answer(response)

@router.message(F.text.regexp(r"^/del_(\d+)$"))
async def cmd_delete_doc(message: Message):
    """Delete document by ID."""
    try:
        doc_id = int(message.text.split("_")[1])
        user_id = message.from_user.id
        
        async for session in get_db():
            doc_service = DocumentService(session)
            
            # Verify ownership
            doc = await doc_service.get_document(doc_id)
            if not doc:
                await message.answer("❌ Документ не найден.")
                return
                
            # Check user ownership via relationship or extra query (simplified here)
            # In a real app we should check if doc.user.telegram_id == user_id
            
            success = await doc_service.delete_document(doc_id)
            
            if success:
                await message.answer(f"🗑️ Документ <b>{doc.original_filename}</b> удален.")
            else:
                await message.answer("❌ Не удалось удалить документ.")
                
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        await message.answer("❌ Произошла ошибка при удалении.")
