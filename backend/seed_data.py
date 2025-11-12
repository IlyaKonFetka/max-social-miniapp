"""
Скрипт для заполнения базы тестовыми данными
"""

import asyncio
from sqlalchemy.orm import Session
from database import SessionLocal, init_db
from models import CallRequest, Volunteer, CallSession
from datetime import datetime, timedelta


def create_test_volunteers(db: Session):
    """Создать тестовых волонтёров"""
    volunteers = [
        Volunteer(
            user_id=10001,
            name="Анна Петрова",
            is_available=True,
            rating=4.8,
            total_calls=25,
            registered_at=datetime.now() - timedelta(days=30)
        ),
        Volunteer(
            user_id=10002,
            name="Иван Сидоров",
            is_available=True,
            rating=4.9,
            total_calls=42,
            registered_at=datetime.now() - timedelta(days=45)
        ),
        Volunteer(
            user_id=10003,
            name="Мария Иванова",
            is_available=False,
            rating=4.7,
            total_calls=18,
            registered_at=datetime.now() - timedelta(days=20)
        ),
        Volunteer(
            user_id=10004,
            name="Дмитрий Козлов",
            is_available=True,
            rating=5.0,
            total_calls=67,
            registered_at=datetime.now() - timedelta(days=60)
        ),
        Volunteer(
            user_id=10005,
            name="Елена Смирнова",
            is_available=True,
            rating=4.6,
            total_calls=31,
            registered_at=datetime.now() - timedelta(days=35)
        ),
    ]
    
    for volunteer in volunteers:
        db.add(volunteer)
    
    db.commit()
    print(f"Создано {len(volunteers)} волонтёров")


def create_test_requests(db: Session):
    """Создать тестовые запросы"""
    requests = [
        CallRequest(
            user_id=20001,
            action_type="read",
            status="completed",
            created_at=datetime.now() - timedelta(hours=2),
            updated_at=datetime.now() - timedelta(hours=1, minutes=55)
        ),
        CallRequest(
            user_id=20002,
            action_type="describe",
            status="completed",
            created_at=datetime.now() - timedelta(hours=5),
            updated_at=datetime.now() - timedelta(hours=4, minutes=50)
        ),
        CallRequest(
            user_id=20003,
            action_type="navigate",
            status="pending",
            created_at=datetime.now() - timedelta(minutes=5)
        ),
        CallRequest(
            user_id=20004,
            action_type="other",
            status="active",
            created_at=datetime.now() - timedelta(minutes=15)
        ),
        CallRequest(
            user_id=20005,
            action_type="read",
            status="cancelled",
            created_at=datetime.now() - timedelta(hours=1),
            updated_at=datetime.now() - timedelta(hours=1)
        ),
    ]
    
    for request in requests:
        db.add(request)
    
    db.commit()
    print(f"Создано {len(requests)} запросов")


def create_test_sessions(db: Session):
    """Создать тестовые сессии"""
    sessions = [
        CallSession(
            request_id=1,
            volunteer_id=1,
            status="completed",
            started_at=datetime.now() - timedelta(hours=2),
            ended_at=datetime.now() - timedelta(hours=1, minutes=55),
            duration=300,
            rating=5
        ),
        CallSession(
            request_id=2,
            volunteer_id=2,
            status="completed",
            started_at=datetime.now() - timedelta(hours=5),
            ended_at=datetime.now() - timedelta(hours=4, minutes=50),
            duration=600,
            rating=4
        ),
        CallSession(
            request_id=4,
            volunteer_id=4,
            status="active",
            started_at=datetime.now() - timedelta(minutes=15)
        ),
    ]
    
    for session in sessions:
        db.add(session)
    
    db.commit()
    print(f"Создано {len(sessions)} сессий")


def seed_database():
    """Заполнить базу тестовыми данными"""
    print("=" * 60)
    print("Заполнение базы данных тестовыми данными")
    print("=" * 60)
    
    # Инициализация базы
    init_db()
    
    # Создание сессии
    db = SessionLocal()
    
    try:
        # Проверка, есть ли уже данные
        existing_volunteers = db.query(Volunteer).count()
        if existing_volunteers > 0:
            print(f"В базе уже есть данные ({existing_volunteers} волонтёров)")
            response = input("Очистить базу и создать новые данные? (y/n): ")
            if response.lower() != 'y':
                print("Отменено")
                return
            
            # Очистка данных
            db.query(CallSession).delete()
            db.query(CallRequest).delete()
            db.query(Volunteer).delete()
            db.commit()
            print("База данных очищена")
        
        # Создание тестовых данных
        create_test_volunteers(db)
        create_test_requests(db)
        create_test_sessions(db)
        
        print("=" * 60)
        print("Тестовые данные успешно созданы!")
        print("=" * 60)
        
    except Exception as e:
        print(f"Ошибка: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

