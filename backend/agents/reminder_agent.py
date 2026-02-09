from langchain_core.messages import AIMessage
from .workflow import AgentState, llm, SystemMessage

async def reminder_agent_node(state: AgentState) -> AgentState:
    """Handle reminder requests."""
    messages = state["messages"]
    
    system_prompt = """Ты агент управления напоминаниями AI ассистента Jarvis.
Твоя задача - помочь пользователю создать напоминание.

В данный момент ты работаешь в режиме MVP. 
Ты должен подтвердить, что понял запрос на создание напоминания, и сообщить пользователю, что функционал сохранения в базу данных находится в разработке, но ты понял, что нужно напомнить.

Формат ответа:
"✅ Я понял, нужно создать напоминание: [суть напоминания] на [время].
(Примечание: сохранение в базу данных будет доступно в ближайшем обновлении)"
"""
    
    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        *messages
    ])
    
    return {
        **state,
        "messages": [response]
    }
