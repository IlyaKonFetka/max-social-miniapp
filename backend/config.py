"""
Конфигурация приложения
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Настройки приложения"""
    
    # База данных
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://miniapp_user:miniapp_password@localhost:5432/miniapp_db"
    )
    
    # Сервер
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8080"))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # CORS
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "*").split(",")
    
    # Название приложения
    APP_NAME: str = "Помощь слабовидящим API"
    APP_VERSION: str = "1.0.0"


settings = Settings()

