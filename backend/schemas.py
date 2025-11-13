"""
Pydantic схемы для валидации данных API
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


# ==================== ENUMS ====================

class UserRole(str, Enum):
    """Роли пользователей"""
    USER = "user"
    VOLUNTEER = "volunteer"
    ADMIN = "admin"


class RequestStatus(str, Enum):
    """Статусы заявок"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ==================== USER ====================

class UserCreate(BaseModel):
    """Схема для создания пользователя"""
    user_id: int = Field(..., description="ID пользователя из MAX")
    name: str = Field(..., description="Имя пользователя")
    role: UserRole = Field(UserRole.USER, description="Роль пользователя")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 12345,
                "name": "Иван Петров",
                "role": "user"
            }
        }


class UserResponse(BaseModel):
    """Схема ответа с информацией о пользователе"""
    user_id: int
    name: str
    role: UserRole
    banned: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Схема для обновления пользователя"""
    name: Optional[str] = None
    role: Optional[UserRole] = None
    banned: Optional[bool] = None


# ==================== REQUEST ====================

class RequestCreate(BaseModel):
    """Схема для создания заявки"""
    user_id: int = Field(..., description="ID пользователя")
    description: str = Field(..., description="Описание задачи")
    when_needed: Optional[datetime] = Field(None, description="Когда нужна помощь")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 12345,
                "description": "Помощь с походом в магазин",
                "when_needed": "2024-01-15T10:00:00"
            }
        }


class RequestResponse(BaseModel):
    """Схема ответа с информацией о заявке"""
    id: int
    user_id: int
    volunteer_id: Optional[int]
    description: str
    when_needed: Optional[datetime]
    status: RequestStatus
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    rating: Optional[int]
    comment: Optional[str]
    
    class Config:
        from_attributes = True


class RequestUpdate(BaseModel):
    """Схема для обновления заявки"""
    volunteer_id: Optional[int] = None
    status: Optional[RequestStatus] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


# ==================== VIDEO SESSION ====================

class VideoSessionCreate(BaseModel):
    """Схема для создания видео-сессии"""
    user_id: int = Field(..., description="ID пользователя")
    room_id: str = Field(..., description="ID комнаты для WebRTC")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 12345,
                "room_id": "room_abc123xyz"
            }
        }


class VideoSessionResponse(BaseModel):
    """Схема ответа с информацией о видео-сессии"""
    id: int
    user_id: int
    volunteer_id: Optional[int]
    room_id: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration: Optional[int]
    rating: Optional[int]
    comment: Optional[str]
    
    class Config:
        from_attributes = True


class VideoSessionUpdate(BaseModel):
    """Схема для обновления видео-сессии"""
    volunteer_id: Optional[int] = None
    status: Optional[str] = None
    ended_at: Optional[datetime] = None
    duration: Optional[int] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


# ==================== VOLUNTEER STATS ====================

class VolunteerStatsResponse(BaseModel):
    """Схема ответа со статистикой волонтёра"""
    volunteer_id: int
    aver_mark: float
    total_calls: int
    total_requests: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
