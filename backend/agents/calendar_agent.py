import json
from datetime import datetime, timedelta
from langchain_core.messages import AIMessage, SystemMessage
from .workflow import AgentState, llm
from db.session import async_session_factory
from services.calendar_service import CalendarService
from services.user_service import get_or_create_user

async def calendar_agent_node(state: AgentState) -> AgentState:
    """Handle calendar requests with database persistence."""
    messages = state["messages"]
    last_message = messages[-1]
    
    # 1. Extract details using LLM
    extraction_prompt = """Extract calendar event details from the user's request.
Return a JSON object with:
- title: event title
- start_time: ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SS)
- end_time: optional ISO 8601 datetime or null (default +1 hour)
- description: optional details

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
        
        content = extraction_response.content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        
        # 2. Save to Database
        async with async_session_factory() as session:
            # Get or create user
            user = await get_or_create_user(session, state["user_id"], state.get("context"))
            
            calendar_service = CalendarService(session)
            start_time = datetime.fromisoformat(data["start_time"])
            end_time = datetime.fromisoformat(data["end_time"]) if data.get("end_time") else None
            
            event = await calendar_service.create_event(
                user_id=user.id,
                title=data["title"],
                start_time=start_time,
                end_time=end_time,
                description=data.get("description")
            )
            response_text = f"📅 Событие запланировано!\n\n📌 **{event.title}**\n🕒 {event.start_time.strftime('%d.%m.%Y %H:%M')}"

                
    except Exception as e:
        response_text = f"❌ Ошибка календаря: {str(e)}"
    
    return {
        **state,
        "messages": [AIMessage(content=response_text)]
    }
