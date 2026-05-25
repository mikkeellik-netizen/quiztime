#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   QuizTime — Автоустановка           ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден!"
    echo "   Скачай с https://nodejs.org (версия 20 LTS)"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не найден!"
    echo "   Скачай с https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo "✅ Docker найден"

# Бэкенд
echo ""
echo "📦 [1/4] Устанавливаю зависимости бэкенда..."
cd backend && npm install

if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Создан файл backend/.env — открой и заполни BOT_TOKEN и JWT_SECRET"
fi
cd ..

# Фронтенд
echo ""
echo "📦 [2/4] Устанавливаю зависимости фронтенда..."
cd frontend && npm install

if [ ! -f .env ]; then
    cp .env.example .env
fi
cd ..

# Docker
echo ""
echo "🐳 [3/4] Запускаю базу данных и Redis..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "⏳ [4/4] Жду запуска базы данных (10 сек)..."
sleep 10

echo ""
echo "🔄 Применяю схему базы данных..."
cd backend
npx prisma generate
npx prisma db push
cd ..

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ УСТАНОВКА ЗАВЕРШЕНА!                     ║"
echo "║                                              ║"
echo "║  Следующие шаги:                             ║"
echo "║  1. Открой backend/.env                      ║"
echo "║  2. Заполни BOT_TOKEN и JWT_SECRET           ║"
echo "║  3. Запусти: bash start-dev.sh               ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
