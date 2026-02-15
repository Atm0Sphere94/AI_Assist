import json
from datetime import datetime
from langchain_core.messages import AIMessage, SystemMessage
from .workflow import AgentState, llm
from db.session import async_session_factory
from services.task_service import TaskService
from services.user_service import get_or_create_user

async def task_agent_node(state: AgentState) -> AgentState:
    """Handle task requests with database persistence."""
    messages = state["messages"]
    last_message = messages[-1]
    
    # 1. Extract details using LLM
    # 1. Extract details and intent using LLM
    extraction_prompt = """Analyze the user's request regarding tasks.
Return a JSON object with:
- intent: "create", "list", "complete", or "delete"
- title: task title (for create) or keywords to find task (for complete/delete)
- description: optional details (for create)
- priority: low, medium, or high (default: medium)

Examples:
"Buy milk" -> {"intent": "create", "title": "Buy milk"}
"Show my tasks" -> {"intent": "list"}
"Complete task Buy milk" -> {"intent": "complete", "title": "Buy milk"}
"Delete task 5" -> {"intent": "delete", "title": "5"}

User Request: {user_request}
"""
    
    try:
        extraction_response = await llm.ainvoke([
            SystemMessage(content=extraction_prompt.format(user_request=last_message.content))
        ])
        
        content = extraction_response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        intent = data.get("intent", "create")
        
        # 2. Execute Action
        async with async_session_factory() as session:
            # Get or create user
            user = await get_or_create_user(session, state["user_id"], state.get("context"))
            task_service = TaskService(session)
            
            if intent == "create":
                task = await task_service.create_task(
                    user_id=user.id,
                    title=data.get("title", "New Task"),
                    description=data.get("description"),
                    priority=data.get("priority", "medium")
                )
                response_text = f"✅ Задача добавлена!\n\n📝 **{task.title}**\nПриоритет: {task.priority}"
                
            elif intent == "list":
                tasks = await task_service.get_user_tasks(user.id)
                if not tasks:
                    response_text = "У вас пока нет задач. Создайте новую!"
                else:
                    active_tasks = [t for t in tasks if t.status != 'completed']
                    if not active_tasks:
                        response_text = "Все задачи выполнены! 🎉"
                    else:
                        lines = ["📋 **Ваши задачи:**"]
                        for t in active_tasks:
                            icon = "🔴" if t.priority == 'high' else "🟡" if t.priority == 'medium' else "🟢"
                            lines.append(f"{t.id}. {icon} {t.title}")
                        response_text = "\n".join(lines)
                        
            elif intent == "complete":
                # Simple search by ID or strict title match (improvement: fuzzy search)
                tasks = await task_service.get_user_tasks(user.id)
                target_title = str(data.get("title", "")).lower()
                
                target_task = None
                # Try to find by ID first if title is a number
                if target_title.isdigit():
                    t_id = int(target_title)
                    target_task = next((t for t in tasks if t.id == t_id), None)
                
                # If not found, try by title
                if not target_task:
                    target_task = next((t for t in tasks if target_title in t.title.lower()), None)
                    
                if target_task:
                    updated = await task_service.update_task(target_task.id, user.id, status="completed", completed_at=datetime.utcnow())
                    response_text = f"✅ Задача \"{updated.title}\" отмечена выполненной!"
                else:
                    response_text = f"❌ Не удалось найти задачу \"{data.get('title')}\""

            elif intent == "delete":
                 tasks = await task_service.get_user_tasks(user.id)
                 target_title = str(data.get("title", "")).lower()
                 
                 target_task = None
                 if target_title.isdigit():
                     t_id = int(target_title)
                     target_task = next((t for t in tasks if t.id == t_id), None)
                 
                 if not target_task:
                     target_task = next((t for t in tasks if target_title in t.title.lower()), None)
                     
                 if target_task:
                     await task_service.delete_task(target_task.id, user.id)
                     response_text = f"🗑️ Задача \"{target_task.title}\" удалена."
                 else:
                     response_text = f"❌ Не удалось найти задачу для удаления."
                     
            else:
                response_text = "Не удалось определить действие с задачей."

                
    except Exception as e:
        response_text = f"❌ Ошибка при обработке задачи: {str(e)}"
    
    return {
        **state,
        "messages": [AIMessage(content=response_text)]
    }
