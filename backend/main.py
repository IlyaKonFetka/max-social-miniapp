"""
Бэкенд для мини-приложения "Помощь слабовидящим"
FastAPI сервер
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import uvicorn

from database import get_db, init_db
from models import CallRequest, Volunteer, CallSession
from schemas import (
    CallRequestCreate,
    CallRequestResponse,
    VolunteerCreate,
    VolunteerResponse,
    CallSessionCreate,
    CallSessionResponse,
    CallSessionUpdate
)

app = FastAPI(
    title="Помощь слабовидящим API",
    description="API для мини-приложения помощи слабовидящим",
    version="1.0.0"
)

# CORS для работы с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Инициализация при запуске"""
    init_db()
    print("База данных инициализирована")


@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "API мини-приложения 'Помощь слабовидящим'",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ==================== ЗАПРОСЫ НА ПОМОЩЬ ====================

@app.post("/api/call-requests", response_model=CallRequestResponse)
async def create_call_request(
    request: CallRequestCreate,
    db: Session = Depends(get_db)
):
    """Создать новый запрос на помощь"""
    db_request = CallRequest(
        user_id=request.user_id,
        action_type=request.action_type,
        status="pending",
        created_at=datetime.now()
    )
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request


@app.get("/api/call-requests/{request_id}", response_model=CallRequestResponse)
async def get_call_request(request_id: int, db: Session = Depends(get_db)):
    """Получить информацию о запросе"""
    request = db.query(CallRequest).filter(CallRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Запрос не найден")
    return request


@app.get("/api/call-requests/pending", response_model=List[CallRequestResponse])
async def get_pending_requests(db: Session = Depends(get_db)):
    """Получить все ожидающие запросы"""
    requests = db.query(CallRequest).filter(
        CallRequest.status == "pending"
    ).order_by(CallRequest.created_at).all()
    return requests


@app.put("/api/call-requests/{request_id}/cancel")
async def cancel_call_request(request_id: int, db: Session = Depends(get_db)):
    """Отменить запрос на помощь"""
    request = db.query(CallRequest).filter(CallRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Запрос не найден")
    
    request.status = "cancelled"
    request.updated_at = datetime.now()
    db.commit()
    return {"message": "Запрос отменён", "request_id": request_id}


# ==================== ВОЛОНТЁРЫ ====================

@app.post("/api/volunteers", response_model=VolunteerResponse)
async def create_volunteer(
    volunteer: VolunteerCreate,
    db: Session = Depends(get_db)
):
    """Зарегистрировать нового волонтёра"""
    db_volunteer = Volunteer(
        user_id=volunteer.user_id,
        name=volunteer.name,
        is_available=True,
        rating=0.0,
        total_calls=0,
        registered_at=datetime.now()
    )
    db.add(db_volunteer)
    db.commit()
    db.refresh(db_volunteer)
    return db_volunteer


@app.get("/api/volunteers/{volunteer_id}", response_model=VolunteerResponse)
async def get_volunteer(volunteer_id: int, db: Session = Depends(get_db)):
    """Получить информацию о волонтёре"""
    volunteer = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Волонтёр не найден")
    return volunteer


@app.get("/api/volunteers/available", response_model=List[VolunteerResponse])
async def get_available_volunteers(db: Session = Depends(get_db)):
    """Получить список доступных волонтёров"""
    volunteers = db.query(Volunteer).filter(
        Volunteer.is_available == True
    ).order_by(Volunteer.rating.desc()).all()
    return volunteers


@app.put("/api/volunteers/{volunteer_id}/availability")
async def update_volunteer_availability(
    volunteer_id: int,
    is_available: bool,
    db: Session = Depends(get_db)
):
    """Обновить доступность волонтёра"""
    volunteer = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Волонтёр не найден")
    
    volunteer.is_available = is_available
    db.commit()
    return {"message": "Доступность обновлена", "volunteer_id": volunteer_id}


# ==================== СЕССИИ ЗВОНКОВ ====================

@app.post("/api/call-sessions", response_model=CallSessionResponse)
async def create_call_session(
    session: CallSessionCreate,
    db: Session = Depends(get_db)
):
    """Создать новую сессию звонка"""
    # Проверяем, что запрос существует
    request = db.query(CallRequest).filter(
        CallRequest.id == session.request_id
    ).first()
    if not request:
        raise HTTPException(status_code=404, detail="Запрос не найден")
    
    # Проверяем, что волонтёр существует
    volunteer = db.query(Volunteer).filter(
        Volunteer.id == session.volunteer_id
    ).first()
    if not volunteer:
        raise HTTPException(status_code=404, detail="Волонтёр не найден")
    
    # Создаём сессию
    db_session = CallSession(
        request_id=session.request_id,
        volunteer_id=session.volunteer_id,
        status="active",
        started_at=datetime.now()
    )
    db.add(db_session)
    
    # Обновляем статус запроса
    request.status = "active"
    request.updated_at = datetime.now()
    
    # Обновляем доступность волонтёра
    volunteer.is_available = False
    
    db.commit()
    db.refresh(db_session)
    return db_session


@app.get("/api/call-sessions/{session_id}", response_model=CallSessionResponse)
async def get_call_session(session_id: int, db: Session = Depends(get_db)):
    """Получить информацию о сессии звонка"""
    session = db.query(CallSession).filter(CallSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    return session


@app.put("/api/call-sessions/{session_id}/end", response_model=CallSessionResponse)
async def end_call_session(
    session_id: int,
    session_update: CallSessionUpdate,
    db: Session = Depends(get_db)
):
    """Завершить сессию звонка"""
    session = db.query(CallSession).filter(CallSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    
    # Обновляем сессию
    session.status = "completed"
    session.ended_at = datetime.now()
    session.duration = session_update.duration
    session.rating = session_update.rating
    
    # Обновляем статус запроса
    request = db.query(CallRequest).filter(
        CallRequest.id == session.request_id
    ).first()
    if request:
        request.status = "completed"
        request.updated_at = datetime.now()
    
    # Обновляем волонтёра
    volunteer = db.query(Volunteer).filter(
        Volunteer.id == session.volunteer_id
    ).first()
    if volunteer:
        volunteer.is_available = True
        volunteer.total_calls += 1
        if session_update.rating:
            # Обновляем средний рейтинг
            total_rating = volunteer.rating * (volunteer.total_calls - 1)
            volunteer.rating = (total_rating + session_update.rating) / volunteer.total_calls
    
    db.commit()
    db.refresh(session)
    return session


@app.get("/api/call-sessions/active", response_model=List[CallSessionResponse])
async def get_active_sessions(db: Session = Depends(get_db)):
    """Получить список активных сессий"""
    sessions = db.query(CallSession).filter(
        CallSession.status == "active"
    ).all()
    return sessions


# ==================== СТАТИСТИКА ====================

@app.get("/api/stats/overview")
async def get_stats_overview(db: Session = Depends(get_db)):
    """Общая статистика"""
    total_requests = db.query(CallRequest).count()
    completed_requests = db.query(CallRequest).filter(
        CallRequest.status == "completed"
    ).count()
    active_sessions = db.query(CallSession).filter(
        CallSession.status == "active"
    ).count()
    total_volunteers = db.query(Volunteer).count()
    available_volunteers = db.query(Volunteer).filter(
        Volunteer.is_available == True
    ).count()
    
    return {
        "total_requests": total_requests,
        "completed_requests": completed_requests,
        "active_sessions": active_sessions,
        "total_volunteers": total_volunteers,
        "available_volunteers": available_volunteers
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True
    )

