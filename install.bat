@echo off
REM Полная установка мини-приложения

echo ========================================
echo Установка мини-приложения
echo "Помощь слабовидящим"
echo ========================================
echo.

REM Проверка Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker не установлен!
    echo Установите Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Проверка Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python не установлен!
    echo Установите Python 3.10+: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Шаг 1/3: Запуск базы данных PostgreSQL...
echo.
cd database
start /wait cmd /c "docker-compose up -d"
if errorlevel 1 (
    echo Ошибка запуска базы данных
    pause
    exit /b 1
)
cd ..

timeout /t 5 /nobreak >nul

echo.
echo Шаг 2/3: Установка бэкенда...
echo.
cd backend

if not exist "venv" (
    echo Создание виртуального окружения...
    python -m venv venv
)

call venv\Scripts\activate.bat
echo Установка зависимостей...
pip install -r requirements.txt -q

if not exist ".env" (
    echo Создание файла .env...
    copy env.example .env >nul
)

echo Инициализация базы данных...
python database.py

echo Заполнение тестовыми данными...
python seed_data.py

cd ..

echo.
echo Шаг 3/3: Готово!
echo.
echo ========================================
echo Установка завершена успешно!
echo ========================================
echo.
echo Для запуска используйте:
echo.
echo   1. База данных уже запущена
echo   2. Backend: cd backend && start.bat
echo   3. Frontend: test-local.bat
echo.
echo Документация:
echo   - README.md - общая информация
echo   - SETUP.md - подробная инструкция
echo   - backend/README.md - API документация
echo   - database/README.md - база данных
echo.
echo ========================================
pause

