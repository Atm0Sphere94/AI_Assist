from langchain_core.messages import AIMessage
from .workflow import AgentState, llm, SystemMessage

async def document_agent_node(state: AgentState) -> AgentState:
    """Handle document processing requests."""
    messages = state["messages"]
    
    system_prompt = """Ты агент обработки документов AI ассистента Jarvis.
Твоя задача - помогать с анализом файлов.

В данный момент ты работаешь в режиме MVP.
Если пользователь загрузил файл, подтверди получение.

Формат ответа:
"📄 Документ получен. Индексация и поиск по документам настраиваются."
"""
    
    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        *messages
    ])
    
    return {
        **state,
        "messages": [response]
    }
