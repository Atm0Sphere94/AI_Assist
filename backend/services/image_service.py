import logging
import uuid
from typing import Optional

from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger(__name__)

class ImageService:
    """Service for generating images using OpenAI DALL-E 3."""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.dalle_model
        
    async def generate_image(self, prompt: str, size: str = "1024x1024", quality: str = "standard") -> str:
        """
        Generate an image based on the prompt.
        Returns the URL of the generated image.
        """
        try:
            logger.info(f"Generating image with prompt: {prompt[:50]}...")
            
            response = await self.client.images.generate(
                model=self.model,
                prompt=prompt,
                size=size,
                quality=quality,
                n=1,
            )
            
            image_url = response.data[0].url
            logger.info("Image generated successfully")
            
            return image_url
            
        except Exception as e:
            logger.error(f"Error generating image: {e}")
            raise e

image_service = ImageService()
