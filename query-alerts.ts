import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  if (alerts.length > 0) {
    console.log('Latest alert:');
    console.log(JSON.stringify(alerts[0], null, 2));
  } else {
    console.log('No alerts found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
