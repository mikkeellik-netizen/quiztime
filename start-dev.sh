#!/bin/bash

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   QuizTime — Запуск для разработки   ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Docker
echo "🐳 Запускаю Docker (БД + Redis)..."
docker-compose -f docker-compose.dev.yml up -d

# Бэкенд в фоне
echo "🚀 Запускаю бэкенд..."
osascript -e 'tell application "Terminal" to do script "cd '"$(pwd)"'/backend && npm run start:dev"' 2>/dev/null || \
  (cd backend && npm run start:dev &)

sleep 5

# Фронтенд
echo "⚛️  Запускаю фронтенд..."
osascript -e 'tell application "Terminal" to do script "cd '"$(pwd)"'/frontend && npm run dev"' 2>/dev/null || \
  (cd frontend && npm run dev &)

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  ✅ Всё запущено!                                 ║"
echo "║                                                   ║"
echo "║  Бэкенд:   http://localhost:3000                 ║"
echo "║  Фронтенд: http://localhost:5173                  ║"
echo "║                                                   ║"
echo "║  Теперь в новом окне запусти:                     ║"
echo "║  ngrok http 3000                                  ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
