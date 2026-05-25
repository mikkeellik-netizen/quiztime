# QuizTime — Стартовый набор

## Что уже готово в этом наборе

- ✅ docker-compose.dev.yml — запуск PostgreSQL + Redis одной командой
- ✅ prisma/schema.prisma — полная схема БД (все 12 таблиц)
- ✅ backend/package.json — все зависимости
- ✅ frontend/package.json — все зависимости
- ✅ .env.example — шаблоны переменных окружения
- ✅ setup-windows.bat / setup-mac.sh — автоустановка
- ✅ start-dev.bat / start-dev.sh — запуск

## Что нужно реализовать (по этапам из документации)

### Бэкенд (NestJS)
- [ ] src/main.ts — bootstrap с Socket.IO
- [ ] src/app.module.ts — все модули
- [ ] modules/auth/ — Telegram initData валидация + JWT
- [ ] modules/game/game.gateway.ts — 15 Socket.IO событий
- [ ] modules/game/game-session.service.ts — логика сессии
- [ ] modules/game/game-flow.service.ts — Auto Flow
- [ ] modules/game/timer.service.ts — серверные таймеры
- [ ] modules/game/answer.service.ts — scoring
- [ ] modules/reconnect/reconnect.service.ts
- [ ] modules/quiz/ — CRUD квизов
- [ ] modules/analytics/ — аналитика + экспорт
- [ ] shared/redis/redis.service.ts
- [ ] shared/prisma/prisma.service.ts

### Фронтенд (React + TypeScript)
- [ ] vite.config.ts
- [ ] src/main.tsx — инициализация
- [ ] src/App.tsx — роутер
- [ ] store/ — 4 Zustand стора
- [ ] socket/ — SocketProvider + события
- [ ] hooks/ — useServerTimer, useGame, useReconnect, useLeaderboard
- [ ] pages/ — 12 страниц
- [ ] services/telegram/ — изолированный слой

## Документация по этапам

Все архитектурные решения, код и схемы описаны в файлах:
- stage1_product_discovery.jsx — концепция, схема БД, экраны
- stage2_uiux_design.jsx — дизайн-система, мокапы
- stage3_backend_architecture.jsx — NestJS, Prisma, Socket.IO
- stage4_frontend.jsx — React, Zustand, хуки, страницы
- stage5_6_constructor_engine.jsx — конструктор, game engine
- stage7_10_analytics_deploy.jsx — аналитика, deploy, тесты
