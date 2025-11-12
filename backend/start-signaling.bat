@echo off
REM Запуск WebSocket signaling сервера для WebRTC

echo ========================================
echo Запуск Signaling сервера
echo ========================================
echo.

REM Проверка Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js не установлен!
    echo Установите Node.js: https://nodejs.org
    pause
    exit /b 1
)

REM Установка зависимостей если нужно
if not exist "node_modules" (
    echo Установка зависимостей...
    npm install
)

echo.
echo Signaling сервер запустится на http://localhost:3001
echo WebSocket endpoint: ws://localhost:3001/ws
echo.
echo Для публичного доступа используйте ngrok:
echo   ngrok http 3001
echo.
echo Для остановки нажмите Ctrl+C
echo.
echo ========================================
echo.

REM Запуск сервера
npm run start-signaling

