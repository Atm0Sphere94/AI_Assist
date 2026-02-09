"""Application configuration using Pydantic Settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    # Telegram
    telegram_bot_token: str
    telegram_webhook_url: Optional[str] = None
    telegram_webhook_secret: Optional[str] = None
    
    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4-turbo-preview"
    openai_embedding_model: str = "text-embedding-3-small"
    
    # Database
    database_url: str
    database_pool_size: int = 20
    database_max_overflow: int = 0
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: Optional[str] = None
    qdrant_collection_name: str = "knowledge_base"
    
    # Application
    secret_key: str
    debug: bool = False
    log_level: str = "INFO"
    allowed_origins: str = "http://localhost:3000"
    
    # File Storage
    upload_dir: str = "/app/uploads"
    max_upload_size: int = 104857600  # 100MB
    
    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"
    
    # Ollama (Uncensored Models)
    use_ollama: bool = Field(default=False)
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="dolphin-mixtral")
    
    # DALL-E Image Generation
    dalle_model: str = Field(default="dall-e-3")
    
    # Allowed Origins for CORS
    allowed_origins: str = Field(default="http://localhost:3000,http://localhost:8000")
    
    # Optional
    stability_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    
    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse allowed origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]


# Global settings instance
settings = Settings()
