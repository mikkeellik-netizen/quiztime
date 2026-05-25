FROM node:18-alpine

# OpenSSL нужен для Prisma
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY src ./src

RUN npx nest build

# Создаём пустую папку public/ если фронтенд не скопирован
RUN mkdir -p /app/public

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]
