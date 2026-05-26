"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const existing = await prisma.user.findFirst({
        where: { telegramId: 1n },
    });
    if (existing) {
        console.log('\n✅ Тестовый пользователь уже существует');
        console.log('   id:', existing.id);
        console.log('   displayName:', existing.displayName);
        return;
    }
    const user = await prisma.user.create({
        data: {
            telegramId: 1n,
            username: 'dev_user',
            displayName: 'Dev User',
        },
    });
    console.log('\n✅ Тестовый пользователь создан');
    console.log('   id:', user.id);
    console.log('   displayName:', user.displayName);
    console.log('\n   Используй этот id как hostUserId при импорте квиза.');
}
main()
    .catch((e) => {
    console.error('❌ Ошибка seed:', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map