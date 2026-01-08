import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding tracked market to database...');

  await prisma.trackedMarket.upsert({
    where: {
      conditionId: '0xd595eb9b81885ff018738300c79047e3ec89e87294424f57a29a7fa9162bf116',
    },
    create: {
      conditionId: '0xd595eb9b81885ff018738300c79047e3ec89e87294424f57a29a7fa9162bf116',
      name: 'Will Trump acquire Greenland before 2027?',
      enabled: true,
    },
    update: {
      name: 'Will Trump acquire Greenland before 2027?',
      enabled: true,
    },
  });

  console.log('✓ Tracked market added successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
