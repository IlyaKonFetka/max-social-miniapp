-- Инициализация базы данных для мини-приложения "Помощь слабовидящим"

-- Создание базы данных (если не существует)
CREATE DATABASE IF NOT EXISTS miniapp_db;

-- Подключение к базе данных
\c miniapp_db;

-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Комментарии к базе данных
COMMENT ON DATABASE miniapp_db IS 'База данных для мини-приложения помощи слабовидящим';

-- Таблицы будут созданы автоматически через SQLAlchemy
-- Этот файл используется для начальной настройки

-- Индексы для оптимизации (создадутся автоматически через модели)
-- CREATE INDEX idx_call_requests_user_id ON call_requests(user_id);
-- CREATE INDEX idx_call_requests_status ON call_requests(status);
-- CREATE INDEX idx_volunteers_user_id ON volunteers(user_id);
-- CREATE INDEX idx_volunteers_available ON volunteers(is_available);

GRANT ALL PRIVILEGES ON DATABASE miniapp_db TO miniapp_user;

