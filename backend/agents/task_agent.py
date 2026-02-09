from langchain_core.messages import AIMessage
from .workflow import AgentState, llm, SystemMessage

async def task_agent_node(state: AgentState) -> AgentState:
    """Handle task management requests."""
    messages = state["messages"]
    
    system_prompt = """Ты агент управления задачами AI ассистента Jarvis.
Твоя задача - помочь пользователю создавать и управлять списками дел.

В данный момент ты работаешь в режиме MVP.
Подтверди, что понял задачу, и сообщи, что она будет сохранена (эмуляция).

Формат ответа:
"✅ Задача принята: [текст задачи].
(Примечание: модуль управления задачами обновляется, скоро здесь будет полный функционал)"
"""
    
    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        *messages
    ])
    
    return {
        **state,
        "messages": [response]
    }
