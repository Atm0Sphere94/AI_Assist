"""Agentic workflow using LangGraph."""
import logging
from typing import Literal, TypedDict, Annotated
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from config import settings

logger = logging.getLogger(__name__)

# Initialize LLM based on configuration
def get_llm():
    """Get LLM instance based on settings."""
    if settings.use_ollama:
        from langchain_community.llms import Ollama
        return Ollama(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            temperature=0.7,
        )
    else:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=settings.openai_model, # Use settings.openai_model as in original
            temperature=0.7,
            api_key=settings.openai_api_key
        )

llm = get_llm()


class AgentState(TypedDict):
    """State for the agentic workflow."""
    messages: Annotated[list, add_messages]
    user_id: int
    intent: str | None
    context: dict


# Import agent nodes
from .task_agent import task_agent_node
from .calendar_agent import calendar_agent_node
from .reminder_agent import reminder_agent_node
from .image_agent import image_agent_node
from .document_agent import document_agent_node
from .rag_agent import rag_agent_node

# Router Node (Sync wrapper logic)
async def router_node(state: AgentState) -> AgentState:
    """
    Analyze state and Determine intent.
    This node calls the LLM to classify the intent and updates the state.
    """
    messages = state["messages"]
    last_message = messages[-1] if messages else None
    
    if not last_message or not hasattr(last_message, 'content'):
        return {**state, "intent": "general"}
        
    # Check for file upload in context
    context = state.get("context", {})
    if context.get("file_path"):
        logger.info(f"File upload detected: {context.get('file_name')}")
        return {**state, "intent": "document"}
    
    user_message = last_message.content
    
    # System prompt for intent classification
    system_prompt = """Ты классификатор намерений пользователя. Определи намерение и верни ТОЛЬКО одно слово:

- task: если пользователь хочет создать задачу, обновить задачу, посмотреть список задач, управлять списками дел
- calendar: если пользователь хочет создать событие в календаре, встречу, запланировать что-то на конкретную дату/время
- reminder: если пользователь просит напомнить о чём-то, создать напоминание
- image: если пользователь просит нарисовать, сгенерировать, создать изображение/картинку
- document: если пользователь загружает документ или просит обработать файл
- knowledge: если пользователь задаёт вопрос, требующий поиска в базе знаний или документах
- general: обычная беседа, приветствие, или неясное намерение

Примеры:
"Создай задачу купить молоко" -> task
"Добавь встречу завтра в 15:00" -> calendar
"Напомни мне через час" -> reminder
"Нарисуй кота" -> image
"Что ты знаешь о Python?" -> knowledge
"Привет, как дела?" -> general

Сообщение пользователя: """
    
    try:
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ])
        
        intent = response.content.strip().lower()
        logger.info(f"Detected intent: {intent} for message: {user_message[:50]}...")
        
        return {**state, "intent": intent}
        
    except Exception as e:
        logger.error(f"Error in intent classification: {e}", exc_info=True)
        return {**state, "intent": "general"}


async def general_response_node(state: AgentState) -> AgentState:
    """Handle general conversation."""
    messages = state["messages"]
    context = state.get("context", {})
    user_system_prompt = context.get("system_prompt", "")
    
    base_system_prompt = """Ты AI ассистент Jarvis (Джарвис). 
Твоя цель - быть максимально полезным помощником для пользователя.

ТВОИ ВОЗМОЖНОСТИ:
1. 📝 **Задачи и списки**: Создаю, отслеживаю и управляю задачами (Todo).
   - Пример: "Создай задачу купить хлеб", "Добавь в список покупок молоко".
   
2. 📅 **Календарь и встречи**: Планирую события и встречи.
   - Пример: "Запланируй встречу завтра в 14:00 с командой".

3. ⏰ **Напоминания**: Устанавливаю напоминания.
   - Пример: "Напомни через 15 минут выключить духовку".

4. 📚 **База знаний (RAG)**: Умею читать и запоминать документы.
   - Просто отправь мне PDF, DOCX или TXT файл.
   - Потом спроси: "Что написано в договоре?", "Найди в документах информацию о проекте".

5. 🖼️ **Работа с изображениями**: (В разработке) Умею генерировать и описывать картинки.

СТРУКТУРА ПРОЕКТА (для справки, если спросят):
Я построен на современной архитектуре:
- **Backend**: Python, LangGraph (агенты), FastAPI.
- **База данных**: PostgreSQL (хранение данных), Qdrant (векторный поиск по документам).
- **Frontend**: Next.js (веб-интерфейс для управления).
- **Integrations**: Telegram Bot, OpenAI GPT-4, Local LLM (Ollama).

Отвечай вежливо, коротко и по делу. Используй эмодзи.
Если пользователь спрашивает "что ты умеешь?", используй список возможностей выше."""

    # Append user's custom prompt if available
    full_system_prompt = base_system_prompt
    if user_system_prompt:
        full_system_prompt += f"\n\nВАЖНЫЕ ИНСТРУКЦИИ ОТ ПОЛЬЗОВАТЕЛЯ:\n{user_system_prompt}"
    
    try:
        response = await llm.ainvoke([
            SystemMessage(content=full_system_prompt),
            *messages
        ])
        
        return {
            **state,
            "messages": [response]
        }
    except Exception as e:
        logger.error(f"Error in general response: {e}", exc_info=True)
        return {
            **state,
            "messages": [AIMessage(content="Извините, произошла ошибка. Попробуйте ещё раз.")]
        }


# Conditional edge function (must be sync)
def route_to_agent(state: AgentState) -> str:
    """Route to appropriate agent based on state intent."""
    intent = state.get("intent", "general")
    
    intent_mapping = {
        "task": "task_agent",
        "calendar": "calendar_agent",
        "reminder": "reminder_agent",
        "image": "image_agent",
        "document": "document_agent",
        "knowledge": "rag_agent",
        "general": "general_response",
    }
    
    return intent_mapping.get(intent, "general_response")


# Build the workflow graph
def build_workflow() -> StateGraph:
    """Build and compile the LangGraph workflow."""
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("router", router_node)
    workflow.add_node("general_response", general_response_node)
    
    # Add agent nodes
    workflow.add_node("task_agent", task_agent_node)
    workflow.add_node("calendar_agent", calendar_agent_node)
    workflow.add_node("reminder_agent", reminder_agent_node)
    workflow.add_node("image_agent", image_agent_node)
    workflow.add_node("document_agent", document_agent_node)
    workflow.add_node("rag_agent", rag_agent_node)
    
    # Set entry point
    workflow.set_entry_point("router")
    
    # Conditional routing from router
    workflow.add_conditional_edges(
        "router",
        route_to_agent,
        {
            "task_agent": "task_agent",
            "calendar_agent": "calendar_agent",
            "reminder_agent": "reminder_agent",
            "image_agent": "image_agent",
            "document_agent": "document_agent",
            "rag_agent": "rag_agent",
            "general_response": "general_response",
        }
    )
    
    # Set finish points for all agents
    workflow.set_finish_point("task_agent")
    workflow.set_finish_point("calendar_agent")
    workflow.set_finish_point("reminder_agent")
    workflow.set_finish_point("image_agent")
    workflow.set_finish_point("document_agent")
    workflow.set_finish_point("rag_agent")
    workflow.set_finish_point("general_response")
    
    # Compile the workflow
    return workflow.compile()

# Global workflow instance
agent_workflow = build_workflow()


async def process_message(user_id: int, message: str, context: dict = None) -> str:
    """
    Process a user message through the agentic workflow.
    
    Args:
        user_id: Telegram user ID
        message: User's message
        context: Optional context dictionary
        
    Returns:
        AI assistant's response
    """
    initial_state = {
        "messages": [HumanMessage(content=message)],
        "user_id": user_id,
        "intent": None,
        "context": context or {},
    }
    
    try:
        result = await agent_workflow.ainvoke(initial_state)
        
        # Extract the last AI message
        messages = result.get("messages", [])
        if messages:
            last_message = messages[-1]
            if hasattr(last_message, 'content'):
                return last_message.content
        
        return "Извините, я не смог обработать ваш запрос."
        
    except Exception as e:
        logger.error(f"Error processing message: {e}", exc_info=True)
        return "Произошла ошибка при обработке вашего сообщения. Попробуйте позже."
