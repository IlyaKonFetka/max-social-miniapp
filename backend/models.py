"""
Модели базы данных SQLAlchemy
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class CallRequest(Base):
    """Модель запроса на помощь от пользователя"""
    __tablename__ = "call_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    action_type = Column(String(50), nullable=False)  # read, describe, navigate, other
    status = Column(String(20), nullable=False, default="pending")  # pending, active, completed, cancelled
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Связь с сессиями
    sessions = relationship("CallSession", back_populates="request")
    
    def __repr__(self):
        return f"<CallRequest(id={self.id}, user_id={self.user_id}, type={self.action_type}, status={self.status})>"


class Volunteer(Base):
    """Модель волонтёра"""
    __tablename__ = "volunteers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)
    is_available = Column(Boolean, default=True, index=True)
    rating = Column(Float, default=0.0)
    total_calls = Column(Integer, default=0)
    registered_at = Column(DateTime, default=datetime.now)
    last_active_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Связь с сессиями
    sessions = relationship("CallSession", back_populates="volunteer")
    
    def __repr__(self):
        return f"<Volunteer(id={self.id}, name={self.name}, available={self.is_available}, rating={self.rating})>"


class CallSession(Base):
    """Модель сессии звонка между пользователем и волонтёром"""
    __tablename__ = "call_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("call_requests.id"), nullable=False)
    volunteer_id = Column(Integer, ForeignKey("volunteers.id"), nullable=False)
    status = Column(String(20), nullable=False, default="active")  # active, completed, interrupted
    started_at = Column(DateTime, default=datetime.now)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # в секундах
    rating = Column(Integer, nullable=True)  # 1-5
    feedback = Column(Text, nullable=True)
    
    # Связи
    request = relationship("CallRequest", back_populates="sessions")
    volunteer = relationship("Volunteer", back_populates="sessions")
    
    def __repr__(self):
        return f"<CallSession(id={self.id}, request_id={self.request_id}, volunteer_id={self.volunteer_id}, status={self.status})>"

