import json
from datetime import datetime, timedelta
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage
from .workflow import AgentState, llm
from db.session import async_session_factory
from services.reminder_service import ReminderService
from services.user_service import get_or_create_user

async def reminder_agent_node(state: AgentState) -> AgentState:
    """Handle reminder requests with database persistence."""
    messages = state["messages"]
    last_message = messages[-1]
    
    # 1. Extract details using LLM
    extraction_prompt = """Extract reminder details from the user's request.
Return a JSON object with:
- title: simple description of the reminder
- remind_at: ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SS) calculated based on "now".
- message: optional detailed message (or null)

Assume "now" is the current time. 
If specific time isn't given but "in X minutes" is, calculate it.
If no time is given, default to +1 hour from now.

Current time: {current_time}
User Request: {user_request}
"""
    
    current_time = datetime.now().isoformat()
    
    try:
        extraction_response = await llm.ainvoke([
            SystemMessage(content=extraction_prompt.format(
                current_time=current_time,
                user_request=last_message.content
            ))
        ])
        
        # Clean parsing of JSON from LLM response
        content = extraction_response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        
        # 2. Save to Database
        async with async_session_factory() as session:
            # Get or create user
            user = await get_or_create_user(session, state["user_id"], state.get("context"))

            reminder_service = ReminderService(session)
            remind_at = datetime.fromisoformat(data["remind_at"])
            
            reminder = await reminder_service.create_reminder(
                user_id=user.id,
                title=data["title"],
                remind_at=remind_at,
                message=data.get("message")
            )
            
            response_text = f"✅ Напоминание создано!\n\n📌 **{reminder.title}**\n🕒 {reminder.remind_at.strftime('%d.%m.%Y %H:%M')}"
                
    except Exception as e:
        response_text = f"❌ Не удалось создать напоминание: {str(e)}"
    
    return {
        **state,
        "messages": [AIMessage(content=response_text)]
    }
