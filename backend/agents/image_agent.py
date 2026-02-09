from langchain_core.messages import AIMessage
from .workflow import AgentState, llm, SystemMessage

async def image_agent_node(state: AgentState) -> AgentState:
    """Handle image generation requests."""
    messages = state["messages"]
    
    system_prompt = """Ты агент генерации изображений AI ассистента Jarvis.
Твоя задача - обрабатывать запросы на создание картинок.

В данный момент ты работаешь в режиме MVP.
Сообщи пользователю, что генерация изображений скоро будет доступна.

Формат ответа:
"🖼️ Я понял ваш запрос на генерацию: [описание].
Функция генерации изображений подключается и будет доступна в ближайшее время."
"""
    
    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        *messages
    ])
    
    return {
        **state,
        "messages": [response]
    }
