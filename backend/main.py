"""
Backend API для мини-приложения помощи людям с ОВ
FastAPI сервер
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from database import get_db, init_db
from models import User, Request, VideoSession, VolunteerStats, RequestStatus, UserRole
from schemas import (
    UserCreate,
    UserResponse,
    UserUpdate,
    RequestCreate,
    RequestResponse,
    RequestUpdate,
    VideoSessionCreate,
    VideoSessionResponse,
    VideoSessionUpdate,
    VolunteerStatsResponse
)

app = FastAPI(
    title="API помощи людям с ОВ",
    description="API для бота и мини-приложения",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== LIFECYCLE ====================

@app.on_event("startup")
async def startup():
    """Инициализация при запуске"""
    init_db()
    print("База данных инициализирована")


@app.get("/")
async def root():
    """Главная страница API"""
    return {
        "message": "API помощи людям с ОВ",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ==================== USERS ====================

@app.post("/api/users", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Создать нового пользователя или вернуть существующего"""
    # Проверяем существование
    existing_user = db.query(User).filter(User.user_id == user.user_id).first()
    if existing_user:
        return existing_user
    
    # Создаём нового
    db_user = User(
        user_id=user.user_id,
        name=user.name,
        role=user.role,
        banned=False
    )
    db.add(db_user)
    
    # Если роль волонтёр - создаём статистику
    if user.role.value == "VOLUNTEER":
        stats = VolunteerStats(volunteer_id=user.user_id)
        db.add(stats)
    
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Получить пользователя по ID"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@app.put("/api/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    """Обновить пользователя"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    if user_update.name is not None:
        user.name = user_update.name
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.banned is not None:
        user.banned = user_update.banned
    
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Получить список пользователей с фильтром"""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    
    users = query.offset(skip).limit(limit).all()
    return users


# ==================== REQUESTS ====================

@app.post("/api/requests", response_model=RequestResponse, status_code=201)
async def create_request(request: RequestCreate, db: Session = Depends(get_db)):
    """Создать новую заявку на помощь"""
    db_request = Request(
        user_id=request.user_id,
        description=request.description,
        latitude=request.latitude,
        longitude=request.longitude,
        address=request.address,
        district=request.district,
        when_needed=request.when_needed,
        status="PENDING"
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


@app.get("/api/requests/{request_id}", response_model=RequestResponse)
async def get_request(request_id: int, db: Session = Depends(get_db)):
    """Получить заявку по ID"""
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return request


@app.get("/api/requests", response_model=List[RequestResponse])
async def list_requests(
    user_id: Optional[int] = None,
    volunteer_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Получить список заявок с фильтрами"""
    query = db.query(Request)
    
    if user_id:
        query = query.filter(Request.user_id == user_id)
    if volunteer_id:
        query = query.filter(Request.volunteer_id == volunteer_id)
    if status:
        query = query.filter(Request.status == status)
    
    requests = query.order_by(Request.created_at.desc()).offset(skip).limit(limit).all()
    return requests


@app.put("/api/requests/{request_id}", response_model=RequestResponse)
async def update_request(
    request_id: int,
    request_update: RequestUpdate,
    db: Session = Depends(get_db)
):
    """Обновить заявку"""
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    if request_update.volunteer_id is not None:
        request.volunteer_id = request_update.volunteer_id
    if request_update.status is not None:
        request.status = request_update.status
        if request_update.status.value == "COMPLETED":
            request.completed_at = datetime.now()
    if request_update.rating is not None:
        request.rating = request_update.rating
    if request_update.comment is not None:
        request.comment = request_update.comment
    
    db.commit()
    db.refresh(request)
    return request


@app.get("/api/requests/pending/all", response_model=List[RequestResponse])
async def get_pending_requests(db: Session = Depends(get_db)):
    """Получить все ожидающие заявки для волонтёров"""
    requests = db.query(Request).filter(Request.status == RequestStatus.PENDING).order_by(Request.created_at).all()
    return requests


# ==================== VIDEO SESSIONS ====================

@app.post("/api/video-sessions", response_model=VideoSessionResponse, status_code=201)
async def create_video_session(session: VideoSessionCreate, db: Session = Depends(get_db)):
    """Создать новую видео-сессию"""
    db_session = VideoSession(
        user_id=session.user_id,
        room_id=session.room_id,
        status="searching"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@app.get("/api/video-sessions/{session_id}", response_model=VideoSessionResponse)
async def get_video_session(session_id: int, db: Session = Depends(get_db)):
    """Получить видео-сессию по ID"""
    session = db.query(VideoSession).filter(VideoSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    return session


@app.put("/api/video-sessions/{session_id}", response_model=VideoSessionResponse)
async def update_video_session(
    session_id: int,
    session_update: VideoSessionUpdate,
    db: Session = Depends(get_db)
):
    """Обновить видео-сессию"""
    session = db.query(VideoSession).filter(VideoSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    
    if session_update.volunteer_id is not None:
        session.volunteer_id = session_update.volunteer_id
    if session_update.status is not None:
        session.status = session_update.status
    if session_update.ended_at is not None:
        session.ended_at = session_update.ended_at
    if session_update.duration is not None:
        session.duration = session_update.duration
    if session_update.rating is not None:
        session.rating = session_update.rating
    if session_update.comment is not None:
        session.comment = session_update.comment
    
    db.commit()
    db.refresh(session)
    return session


# ==================== VOLUNTEER STATS ====================

@app.get("/api/volunteers/{volunteer_id}/stats", response_model=VolunteerStatsResponse)
async def get_volunteer_stats(volunteer_id: int, db: Session = Depends(get_db)):
    """Получить статистику волонтёра"""
    stats = db.query(VolunteerStats).filter(VolunteerStats.volunteer_id == volunteer_id).first()
    if not stats:
        raise HTTPException(status_code=404, detail="Статистика не найдена")
    return stats


@app.get("/api/volunteers/available", response_model=List[UserResponse])
async def get_available_volunteers(db: Session = Depends(get_db)):
    """Получить список доступных волонтёров"""
    # TODO: Добавить статус онлайн/оффлайн
    volunteers = db.query(User).filter(
        User.role == UserRole.VOLUNTEER,
        User.banned == False
    ).all()
    return volunteers


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
