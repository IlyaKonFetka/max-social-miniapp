"""
Модели базы данных для мини-приложения помощи людям с ОВ
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from database import Base


class UserRole(enum.Enum):
    """Роли пользователей"""
    USER = "user"  # Человек с ОВ (нужна помощь)
    VOLUNTEER = "volunteer"  # Волонтёр
    ADMIN = "admin"  # Администратор


class RequestStatus(enum.Enum):
    """Статусы заявок на отложенную помощь"""
    PENDING = "pending"  # Ожидает волонтёра
    ACCEPTED = "accepted"  # Волонтёр принял
    IN_PROGRESS = "in_progress"  # В процессе выполнения
    COMPLETED = "completed"  # Выполнена
    CANCELLED = "cancelled"  # Отменена


class ReportStatus(enum.Enum):
    """Статусы жалоб"""
    PENDING = "pending"  # Ожидает рассмотрения
    IN_REVIEW = "in_review"  # На рассмотрении
    RESOLVED = "resolved"  # Решена
    REJECTED = "rejected"  # Отклонена


class User(Base):
    """Модель пользователя"""
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)  # ID из MAX
    name = Column(String(200), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.USER)
    banned = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    
    # Связи
    requests = relationship("Request", foreign_keys="Request.user_id", back_populates="user")
    volunteer_requests = relationship("Request", foreign_keys="Request.volunteer_id", back_populates="volunteer")
    video_sessions_user = relationship("VideoSession", foreign_keys="VideoSession.user_id", back_populates="user")
    video_sessions_volunteer = relationship("VideoSession", foreign_keys="VideoSession.volunteer_id", back_populates="volunteer")
    volunteer_stats = relationship("VolunteerStats", back_populates="volunteer", uselist=False)
    reports_made = relationship("Report", foreign_keys="Report.reporter_id", back_populates="reporter")
    reports_resolved = relationship("Report", foreign_keys="Report.resolved_by", back_populates="resolver")
    
    def __repr__(self):
        return f"<User(id={self.user_id}, name={self.name}, role={self.role.value})>"


class Request(Base):
    """Модель заявки на отложенную помощь"""
    __tablename__ = "requests"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    volunteer_id = Column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)
    description = Column(Text, nullable=False)
    when_needed = Column(DateTime, nullable=True)  # Когда нужна помощь
    status = Column(Enum(RequestStatus), nullable=False, default=RequestStatus.PENDING)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    completed_at = Column(DateTime, nullable=True)
    rating = Column(Integer, nullable=True)  # Оценка 1-5
    comment = Column(Text, nullable=True)  # Комментарий от пользователя
    
    # Связи
    user = relationship("User", foreign_keys=[user_id], back_populates="requests")
    volunteer = relationship("User", foreign_keys=[volunteer_id], back_populates="volunteer_requests")
    reports = relationship("Report", back_populates="request")
    
    def __repr__(self):
        return f"<Request(id={self.id}, user_id={self.user_id}, status={self.status.value})>"


class VideoSession(Base):
    """Модель видео-сессии"""
    __tablename__ = "video_sessions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    volunteer_id = Column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)
    room_id = Column(String(100), nullable=False, unique=True, index=True)  # Для WebRTC
    status = Column(String(20), nullable=False, default="searching")  # searching, connecting, active, completed, cancelled
    started_at = Column(DateTime, default=datetime.now)
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # Длительность в секундах
    rating = Column(Integer, nullable=True)  # Оценка 1-5
    comment = Column(Text, nullable=True)
    
    # Связи
    user = relationship("User", foreign_keys=[user_id], back_populates="video_sessions_user")
    volunteer = relationship("User", foreign_keys=[volunteer_id], back_populates="video_sessions_volunteer")
    archive = relationship("Archive", back_populates="session", uselist=False)
    
    def __repr__(self):
        return f"<VideoSession(id={self.id}, room_id={self.room_id}, status={self.status})>"


class Archive(Base):
    """Архив завершённых сессий"""
    __tablename__ = "archives"
    
    session_id = Column(Integer, ForeignKey("video_sessions.id"), primary_key=True)
    link = Column(String(500), nullable=True)  # Ссылка на запись (если есть)
    created_at = Column(DateTime, default=datetime.now)
    
    # Связи
    session = relationship("VideoSession", back_populates="archive")
    reports = relationship("Report", back_populates="archive")
    
    def __repr__(self):
        return f"<Archive(session_id={self.session_id})>"


class VolunteerStats(Base):
    """Статистика волонтёра"""
    __tablename__ = "volunteer_stats"
    
    volunteer_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    aver_mark = Column(Float, default=0.0)  # Средняя оценка
    total_calls = Column(Integer, default=0)  # Всего видео-звонков
    total_requests = Column(Integer, default=0)  # Всего отложенных заявок
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Связи
    volunteer = relationship("User", back_populates="volunteer_stats")
    
    def __repr__(self):
        return f"<VolunteerStats(volunteer_id={self.volunteer_id}, rating={self.aver_mark})>"


class Report(Base):
    """Жалоба"""
    __tablename__ = "reports"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reporter_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    resolved_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    status = Column(Enum(ReportStatus), nullable=False, default=ReportStatus.PENDING)
    reason_body = Column(Text, nullable=False)
    archive_id = Column(Integer, ForeignKey("archives.session_id"), nullable=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    resolved_at = Column(DateTime, nullable=True)
    
    # Связи
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reports_made")
    resolver = relationship("User", foreign_keys=[resolved_by], back_populates="reports_resolved")
    archive = relationship("Archive", back_populates="reports")
    request = relationship("Request", back_populates="reports")
    
    def __repr__(self):
        return f"<Report(id={self.id}, reporter_id={self.reporter_id}, status={self.status.value})>"
