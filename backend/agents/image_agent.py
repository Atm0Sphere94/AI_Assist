from langchain_core.messages import AIMessage
from .workflow import AgentState, llm, SystemMessage
from services.image_service import image_service

async def image_agent_node(state: AgentState) -> AgentState:
    """Handle image generation requests."""
    messages = state["messages"]
    last_message = messages[-1]
    
    system_prompt = """Ты агент генерации изображений AI ассистента Jarvis.
Твоя задача - извлечь описание изображения из запроса пользователя и передать его в DALL-E.
Очисти запрос от слов "нарисуй", "сгенерируй", "создай картинку" и оставь только описание.
Если описание на русском - переведи его на английский для лучшего качества.
"""
    
    # Extract prompt for DALL-E
    prompt_response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        last_message
    ])
    
    image_prompt = prompt_response.content
    
    try:
        # Generate image
        image_url = await image_service.generate_image(prompt=image_prompt)
        
        response_text = (
            f"🎨 **Готово!**\n\n"
            f"🖌️ *Запрос:* {image_prompt}\n\n"
            f"[Открыть изображение]({image_url})"
        )
        
    except Exception as e:
        response_text = f"❌ Не удалось сгенерировать изображение: {str(e)}"
    
    return {
        **state,
        "messages": [AIMessage(content=response_text)]
    }
