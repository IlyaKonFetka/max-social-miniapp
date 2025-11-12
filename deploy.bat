@echo off
REM Скрипт деплоя мини-приложения на GitHub Pages
REM Использование: deploy.bat "Сообщение коммита"

echo ========================================
echo Деплой мини-приложения на GitHub
echo ========================================
echo.

REM Проверка, инициализирован ли Git
if not exist ".git" (
    echo Git репозиторий не инициализирован!
    echo Сначала выполните команды из DEPLOY.md
    pause
    exit /b 1
)

REM Получаем сообщение коммита
set COMMIT_MESSAGE=%~1
if "%COMMIT_MESSAGE%"=="" (
    set COMMIT_MESSAGE=Update miniapp
)

echo Добавление изменений...
git add .

echo Создание коммита: "%COMMIT_MESSAGE%"
git commit -m "%COMMIT_MESSAGE%"

if errorlevel 1 (
    echo Нет изменений для коммита
) else (
    echo Отправка на GitHub...
    git push
    
    if errorlevel 1 (
        echo Ошибка при отправке на GitHub
        pause
        exit /b 1
    )
    
    echo.
    echo Успешно! Изменения загружены на GitHub
    echo Обновление на GitHub Pages займёт 1-2 минуты
)

echo.
echo ========================================
pause

