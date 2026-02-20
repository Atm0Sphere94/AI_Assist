"""Web Search Agent using DuckDuckGo."""
import logging
from typing import TypedDict, Annotated
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_community.tools import DuckDuckGoSearchResults
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
            model=settings.openai_model,
            temperature=0.7,
            api_key=settings.openai_api_key
        )

llm = get_llm()
search_tool = DuckDuckGoSearchResults(backend="text", num_results=5)

async def search_agent_node(state: dict) -> dict:
    """Agent node that performs web searches and summarizes results."""
    logger.info("Executing search_agent_node")
    messages = state["messages"]
    last_message = messages[-1] if messages else None
    
    if not last_message or not isinstance(last_message, HumanMessage):
        return state
        
    user_query = last_message.content
    
    try:
        # First step: extract a good search query from the user message, or just use it directly
        search_query_prompt = f"""Сформулируй краткий и точный поисковый запрос (2-5 слов максимум) 
на основе этого сообщения пользователя: "{user_query}". Верни ТОЛЬКО текст запроса без кавычек и пояснений."""
        
        query_response = await llm.ainvoke([HumanMessage(content=search_query_prompt)])
        optimized_query = query_response.content.strip()
        logger.info(f"Optimized search query: {optimized_query}")
        
        # Perform the search
        search_results_raw = search_tool.invoke(optimized_query)
        logger.info(f"Search results received (length: {len(search_results_raw)})")
        
        # Second step: format the results nicely for the user
        synthesis_prompt = f"""Ты полезный AI ассистент с доступом в Интернет. Твоя цель - дать пользователю развернутый и полезный ответ на его запрос, опираясь НАЙДЕННЫЕ В ИНТЕРНЕТЕ ДАННЫЕ.
Обязательно приводи ссылки на источники, если они уместны (например, товары, статьи).
Структурируй текст красиво (списки, жирный шрифт).

Запрос пользователя: {user_query}

Найденные результаты в интернете:
{search_results_raw}

Напиши понятный ответ на русском языке на основе этих результатов."""
        
        final_response = await llm.ainvoke([SystemMessage(content=synthesis_prompt)])
        
        return {
            **state,
            "messages": [final_response]
        }
        
    except Exception as e:
        logger.error(f"Error in search agent: {e}", exc_info=True)
        return {
            **state,
            "messages": [AIMessage(content="Извините, при выполнении поискового запроса произошла ошибка. Попробуйте еще раз или сформулируйте запрос иначе.")]
        }
