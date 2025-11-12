@echo off
REM Остановка PostgreSQL

echo ========================================
echo Остановка PostgreSQL
echo ========================================
echo.

docker-compose down

echo.
echo PostgreSQL остановлен
echo.
echo ========================================

pause

