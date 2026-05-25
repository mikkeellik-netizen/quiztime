FROM node:18-alpine

# OpenSSL нужен для Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Копируем конфиги и package.json
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma/

# Устанавливаем все зависимости (включая dev для сборки)
RUN npm install

# Генерируем Prisma Client
RUN npx prisma generate

# Копируем исходники
COPY src ./src

# Собираем NestJS
RUN npx nest build

EXPOSE 3000

# Запуск: синхронизируем схему БД, затем стартуем
CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]
