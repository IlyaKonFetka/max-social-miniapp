"""
Настройка подключения к базе данных PostgreSQL
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Параметры подключения к PostgreSQL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://miniapp_user:miniapp_password@localhost:5432/miniapp_db"
)

# Создание engine
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Логирование SQL запросов (отключить в продакшене)
    pool_size=5,
    max_overflow=10
)

# Создание сессии
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()


def get_db():
    """
    Dependency для получения сессии БД
    Используется в FastAPI endpoints
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Инициализация базы данных
    Создание всех таблиц
    """
    from models import CallRequest, Volunteer, CallSession
    Base.metadata.create_all(bind=engine)
    print("Таблицы созданы успешно")


def drop_db():
    """
    Удаление всех таблиц (для разработки)
    """
    Base.metadata.drop_all(bind=engine)
    print("Таблицы удалены")


if __name__ == "__main__":
    print("Инициализация базы данных...")
    init_db()

