@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════╗
echo ║   QuizTime — Автоустановка           ║
echo ║   Подожди, это займёт ~3-5 минут     ║
echo ╚══════════════════════════════════════╝
echo.

:: Проверка Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден!
    echo Скачай с https://nodejs.org и установи версию 20 LTS
    pause
    exit /b 1
)
echo [OK] Node.js найден

:: Проверка Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Docker не найден!
    echo Скачай с https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [OK] Docker найден

:: Установка зависимостей бэкенда
echo.
echo [1/4] Устанавливаю зависимости бэкенда...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось установить зависимости бэкенда
    pause
    exit /b 1
)

:: Копирование .env
if not exist .env (
    copy .env.example .env
    echo [!] Создан файл backend\.env
    echo [!] ОТКРОЙ его и заполни BOT_TOKEN и JWT_SECRET
)

cd ..

:: Установка зависимостей фронтенда
echo.
echo [2/4] Устанавливаю зависимости фронтенда...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось установить зависимости фронтенда
    pause
    exit /b 1
)

:: Копирование .env фронтенда
if not exist .env (
    copy .env.example .env
)

cd ..

echo.
echo [3/4] Запускаю базу данных и Redis...
docker-compose -f docker-compose.dev.yml up -d
if %errorlevel% neq 0 (
    echo [ОШИБКА] Не удалось запустить Docker
    echo Убедись что Docker Desktop запущен!
    pause
    exit /b 1
)

echo.
echo [4/4] Жду пока база данных запустится...
timeout /t 10 /nobreak >nul

echo.
echo [OK] Применяю миграции базы данных...
cd backend
call npx prisma generate
call npx prisma db push
cd ..

echo.
echo ╔══════════════════════════════════════════════╗
echo ║  УСТАНОВКА ЗАВЕРШЕНА!                        ║
echo ║                                              ║
echo ║  Следующие шаги:                             ║
echo ║  1. Открой backend\.env                      ║
echo ║  2. Заполни BOT_TOKEN и JWT_SECRET           ║
echo ║  3. Запусти start-dev.bat                    ║
echo ╚══════════════════════════════════════════════╝
echo.
pause
