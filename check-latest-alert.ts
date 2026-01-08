import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latest = await prisma.alert.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (latest) {
    console.log('Latest alert type:', latest.type);
    console.log('Created:', latest.createdAt);
    console.log('\nPayload:');
    console.log(JSON.stringify(latest.payload, null, 2));
  } else {
    console.log('No alerts found');
  }
}

main().finally(() => prisma.$disconnect());
