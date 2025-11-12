@echo off
REM Запуск PostgreSQL через Docker Compose

echo ========================================
echo Запуск PostgreSQL для мини-приложения
echo ========================================
echo.

REM Проверка Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker не установлен или не запущен!
    echo Установите Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo Запуск контейнеров...
docker-compose up -d

if errorlevel 1 (
    echo Ошибка при запуске контейнеров
    pause
    exit /b 1
)

echo.
echo PostgreSQL запущен!
echo.
echo Подключение:
echo   Host: localhost
echo   Port: 5432
echo   Database: miniapp_db
echo   User: miniapp_user
echo   Password: miniapp_password
echo.
echo Adminer (веб-интерфейс): http://localhost:8081
echo.
echo Для остановки используйте stop.bat
echo.
echo ========================================

pause

