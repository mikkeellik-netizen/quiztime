@echo off
chcp 65001 >nul
echo.
echo ╔═══════════════════════════════════════╗
echo ║   QuizTime — Запуск для разработки   ║
echo ╚═══════════════════════════════════════╝
echo.
echo Запускаю Docker (БД + Redis)...
docker-compose -f docker-compose.dev.yml up -d

echo.
echo Запускаю бэкенд в отдельном окне...
start "QuizTime Backend" cmd /k "cd backend && npm run start:dev"

echo.
echo Жду 5 секунд пока запустится бэкенд...
timeout /t 5 /nobreak >nul

echo.
echo Запускаю фронтенд в отдельном окне...
start "QuizTime Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ╔═══════════════════════════════════════════════════╗
echo ║  Всё запущено!                                    ║
echo ║                                                   ║
echo ║  Бэкенд:  http://localhost:3000                  ║
echo ║  Фронтенд: http://localhost:5173                  ║
echo ║                                                   ║
echo ║  Теперь запусти ngrok в отдельном окне:           ║
echo ║  ngrok http 3000                                  ║
echo ╚═══════════════════════════════════════════════════╝
echo.
pause
