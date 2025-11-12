"""
Pydantic схемы для валидации данных API
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# ==================== ЗАПРОСЫ НА ПОМОЩЬ ====================

class CallRequestCreate(BaseModel):
    """Схема для создания запроса на помощь"""
    user_id: int = Field(..., description="ID пользователя в MAX")
    action_type: str = Field(..., description="Тип помощи: read, describe, navigate, other")
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": 12345,
                "action_type": "read"
            }
        }


class CallRequestResponse(BaseModel):
    """Схема ответа с информацией о запросе"""
    id: int
    user_id: int
    action_type: str
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


# ==================== ВОЛОНТЁРЫ ====================

class VolunteerCreate(BaseModel):
    """Схема для регистрации волонтёра"""
    user_id: int = Field(..., description="ID пользователя в MAX")
    name: str = Field(..., description="Имя волонтёра")
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": 67890,
                "name": "Иван Иванов"
            }
        }


class VolunteerResponse(BaseModel):
    """Схема ответа с информацией о волонтёре"""
    id: int
    user_id: int
    name: str
    is_available: bool
    rating: float
    total_calls: int
    registered_at: datetime
    last_active_at: datetime
    
    class Config:
        orm_mode = True


# ==================== СЕССИИ ЗВОНКОВ ====================

class CallSessionCreate(BaseModel):
    """Схема для создания сессии звонка"""
    request_id: int = Field(..., description="ID запроса на помощь")
    volunteer_id: int = Field(..., description="ID волонтёра")
    
    class Config:
        schema_extra = {
            "example": {
                "request_id": 1,
                "volunteer_id": 1
            }
        }


class CallSessionUpdate(BaseModel):
    """Схема для обновления сессии звонка"""
    duration: Optional[int] = Field(None, description="Длительность звонка в секундах")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Оценка от 1 до 5")
    feedback: Optional[str] = Field(None, description="Отзыв о звонке")
    
    class Config:
        schema_extra = {
            "example": {
                "duration": 180,
                "rating": 5,
                "feedback": "Очень помогли, спасибо!"
            }
        }


class CallSessionResponse(BaseModel):
    """Схема ответа с информацией о сессии звонка"""
    id: int
    request_id: int
    volunteer_id: int
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration: Optional[int]
    rating: Optional[int]
    feedback: Optional[str]
    
    class Config:
        orm_mode = True

