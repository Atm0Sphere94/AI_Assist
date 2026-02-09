from langchain_core.messages import AIMessage
from .workflow import AgentState, llm, SystemMessage
from services.image_service import image_service
from telegram.bot import bot

async def image_agent_node(state: AgentState) -> AgentState:
    """Handle image generation requests."""
    messages = state["messages"]
    last_message = messages[-1]
    context = state.get("context", {})
    chat_id = context.get("chat_id")
    
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
    status_msg = None
    
    try:
        # Send intermediate status
        if chat_id:
            status_msg = await bot.send_message(
                chat_id, 
                f"🎨 Генерирую изображение...\n🖌️ *Запрос:* {image_prompt}"
            )
        
        # Generate image
        image_url = await image_service.generate_image(prompt=image_prompt)
        
        # Send photo directly
        if chat_id:
            await bot.send_photo(
                chat_id,
                photo=image_url,
                caption=f"🎨 **Готово!**\n🖌️ *Запрос:* {image_prompt}"
            )
            # Delete status message
            if status_msg:
                try:
                    await status_msg.delete()
                except:
                    pass
            
            # Return empty message to avoid double sending (handler will send this)
            response_text = "✅" 
        else:
            # Fallback for non-telegram context
            response_text = f"[Изображение]({image_url})"
        
    except Exception as e:
        response_text = f"❌ Не удалось сгенерировать изображение: {str(e)}"
        if status_msg:
            try:
                await status_msg.edit_text(response_text)
            except:
                pass
    
    return {
        **state,
        "messages": [AIMessage(content=response_text)]
    }
