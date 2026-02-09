from langchain_core.messages import AIMessage, SystemMessage
from .workflow import AgentState, llm
from db.session import async_session_factory
from services.rag_service import RAGService
from services.user_service import get_or_create_user

async def rag_agent_node(state: AgentState) -> AgentState:
    """Handle knowledge base requests (RAG)."""
    messages = state["messages"]
    last_message = messages[-1]
    query = last_message.content
    
    try:
        async with async_session_factory() as session:
            # Get or create user
            user = await get_or_create_user(session, state["user_id"], state.get("context"))
            
            # 1. Search in RAG
            rag_service = RAGService(session)
            search_results = await rag_service.search(query, user_id=user.id, limit=5)
            
            if not search_results:
                return {
                    **state, 
                    "messages": [AIMessage(content="🤔 Я поискал в вашей базе знаний, но не нашел точной информации по этому запросу. Попробуйте переформулировать вопрос или загрузить соответствующие документы.")]
                }
            
            # 2. Construct Prompt with Context
            context_text = "\n\n".join([
                f"Document: {res['filename']}\nContent: {res['text']}" 
                for res in search_results
            ])
            
            rag_prompt = f"""Ты интеллектуальный помощник Jarvis.
Твоя задача - ответить на вопрос пользователя, используя ТОЛЬКО предоставленный ниже контекст из базы знаний.

Контекст:
{context_text}

Вопрос пользователя: {query}

Инструкции:
1. Используй только информацию из контекста.
2. Если в контексте нет ответа, так и скажи.
3. Отвечай подробно и структурировано.
4. Указывай источник (название документа), если это уместно.

Ответ:
"""
            
            # 3. Generate Answer
            response_ai = await llm.ainvoke([
                SystemMessage(content=rag_prompt)
            ])
            
            response_text = response_ai.content
            
    except Exception as e:
        response_text = f"❌ Ошибка при поиске информации: {str(e)}"
    
    return {
        **state,
        "messages": [AIMessage(content=response_text)]
    }
