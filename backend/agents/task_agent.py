import json
from langchain_core.messages import AIMessage, SystemMessage
from .workflow import AgentState, llm
from db.session import async_session_factory
from services.task_service import TaskService
from db.models import User
from sqlalchemy import select

async def task_agent_node(state: AgentState) -> AgentState:
    """Handle task requests with database persistence."""
    messages = state["messages"]
    last_message = messages[-1]
    
    # 1. Extract details using LLM
    extraction_prompt = """Extract task details from the user's request.
Return a JSON object with:
- title: task title
- description: optional details
- priority: low, medium, or high (default: medium)

User Request: {user_request}
"""
    
    try:
        extraction_response = await llm.ainvoke([
            SystemMessage(content=extraction_prompt.format(user_request=last_message.content))
        ])
        
        content = extraction_response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        
        # 2. Save to Database
        async with async_session_factory() as session:
            result = await session.execute(select(User).limit(1))
            user = result.scalar_one_or_none()
            
            if user:
                task_service = TaskService(session)
                task = await task_service.create_task(
                    user_id=user.id,
                    title=data["title"],
                    description=data.get("description"),
                    priority=data.get("priority", "medium")
                )
                response_text = f"✅ Задача добавлена!\n\n📝 **{task.title}**\nПриоритет: {task.priority}"
            else:
                response_text = "❌ Пользователь не найден."
                
    except Exception as e:
        response_text = f"❌ Ошибка при создании задачи: {str(e)}"
    
    return {
        **state,
        "messages": [AIMessage(content=response_text)]
    }
