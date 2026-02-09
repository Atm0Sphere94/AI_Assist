from langchain_core.messages import AIMessage
from .workflow import AgentState, llm, SystemMessage

async def calendar_agent_node(state: AgentState) -> AgentState:
    """Handle calendar requests."""
    messages = state["messages"]
    
    system_prompt = """Ты агент календаря AI ассистента Jarvis.
Твоя задача - помочь пользователю планировать встречи и события.

В данный момент ты работаешь в режиме MVP.
Подтверди, что понял событие и время, и сообщи об этом.

Формат ответа:
"📅 Событие запланировано: [событие] на [дата/время].
(Примечание: интеграция с календарем находится в процессе настройки)"
"""
    
    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        *messages
    ])
    
    return {
        **state,
        "messages": [response]
    }
