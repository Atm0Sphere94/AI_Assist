from langchain_core.messages import AIMessage
from .workflow import AgentState, llm, SystemMessage

async def rag_agent_node(state: AgentState) -> AgentState:
    """Handle knowledge base requests (RAG)."""
    messages = state["messages"]
    
    system_prompt = """Ты агент базы знаний AI ассистента Jarvis.
Твоя задача - искать ответы в базе знаний.

В данный момент ты работаешь в режиме MVP.
Сообщи, что поиск по базе знаний настраивается.

Формат ответа:
"📚 Запрос к базе знаний принят. Поиск информации временно недоступен (идет индексация)."
"""
    
    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        *messages
    ])
    
    return {
        **state,
        "messages": [response]
    }
