from langchain_core.messages import AIMessage
from .workflow import AgentState
from db.session import async_session_factory
from services.document_service import DocumentService
from services.rag_service import RAGService
from services.user_service import get_or_create_user

async def document_agent_node(state: AgentState) -> AgentState:
    """Handle document processing requests."""
    context = state.get("context", {})
    file_path = context.get("file_path")
    
    if not file_path:
        return {
            **state,
            "messages": [AIMessage(content="⚠️ Пожалуйста, отправьте мне файл для обработки (PDF, DOCX, TXT).")]
        }
    
    try:
        async with async_session_factory() as session:
            # Get or create user
            user = await get_or_create_user(session, state["user_id"], context)

            # 1. Create Document record
            doc_service = DocumentService(session)
            document = await doc_service.create_document(
                user_id=user.id,
                file_path=file_path,
                original_filename=context.get("file_name", "unknown"),
                metadata={"mime_type": context.get("mime_type")}
            )
            
            # 2. Index in RAG
            rag_service = RAGService(session)
            indexed = await rag_service.index_document(document.id)
            
            if indexed:
                response_text = f"✅ Документ **{document.original_filename}** успешно обработан и добавлен в базу знаний!\nТеперь вы можете задавать вопросы по его содержанию."
            else:
                response_text = f"⚠️ Документ **{document.original_filename}** сохранен, но не удалось проиндексировать текст. Возможно, формат не поддерживается или файл пуст."
                
    except Exception as e:
        response_text = f"❌ Ошибка при обработке документа: {str(e)}"
    
    return {
        **state,
        "messages": [AIMessage(content=response_text)]
    }
