@echo off
REM Запуск всех компонентов мини-приложения

echo ========================================
echo Запуск мини-приложения
echo ========================================
echo.

REM Проверка установки
if not exist "backend\venv" (
    echo Backend не установлен!
    echo Запустите install.bat для установки
    pause
    exit /b 1
)

docker ps >nul 2>&1
if errorlevel 1 (
    echo Docker не запущен!
    echo Запустите Docker Desktop
    pause
    exit /b 1
)

echo Запуск базы данных...
cd database
docker-compose up -d
cd ..

timeout /t 3 /nobreak >nul

echo Запуск бэкенда в новом окне...
start "Backend API" cmd /k "cd backend && venv\Scripts\activate && python main.py"

timeout /t 3 /nobreak >nul

echo Запуск фронтенда в новом окне...
start "Frontend" cmd /k "python -m http.server 8000"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Все компоненты запущены!
echo ========================================
echo.
echo Frontend: http://localhost:8000
echo Backend API: http://localhost:8080
echo API Docs: http://localhost:8080/docs
echo Adminer: http://localhost:8081
echo.
echo Для остановки закройте окна терминалов
echo или нажмите Ctrl+C в каждом окне
echo.
echo ========================================

