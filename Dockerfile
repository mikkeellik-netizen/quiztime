# ===== Этап 1: Сборка React фронтенда =====
FROM node:18-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# ===== Этап 2: Сборка NestJS бэкенда =====
FROM node:18-alpine AS backend-build

RUN apk add --no-cache openssl

WORKDIR /app

COPY backend/package*.json ./
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY backend/src ./src
RUN npx nest build

# ===== Этап 3: Runtime =====
FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Копируем зависимости и скомпилированный бэкенд
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/prisma ./prisma
COPY backend/package*.json ./

# Копируем скомпилированный фронтенд в папку public/
COPY --from=frontend-build /frontend/dist ./public

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]
