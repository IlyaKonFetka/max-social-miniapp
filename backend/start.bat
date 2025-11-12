@echo off
REM Скрипт запуска бэкенд сервера

echo ========================================
echo Запуск Backend API
echo ========================================
echo.

REM Проверка виртуального окружения
if not exist "venv" (
    echo Создание виртуального окружения...
    python -m venv venv
)

REM Активация окружения
call venv\Scripts\activate.bat

REM Установка зависимостей
echo Установка зависимостей...
pip install -r requirements.txt

echo.
echo Запуск сервера на http://localhost:8080
echo.
echo Документация API:
echo   Swagger: http://localhost:8080/docs
echo   ReDoc: http://localhost:8080/redoc
echo.
echo Для остановки нажмите Ctrl+C
echo.
echo ========================================
echo.

REM Запуск сервера
python main.py

