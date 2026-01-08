import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alerts = await prisma.alert.findMany({
    where: {
      type: {
        in: ['LARGE_TRADE', 'WHALE_ACTIVITY']
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });

  console.log('📊 Trade Alert Examples:\n');

  for (const alert of alerts) {
    console.log('='.repeat(70));
    console.log('Alert Type:', alert.type);
    console.log('Created:', alert.createdAt);
    console.log('Sent:', alert.webhookSent ? 'Yes' : 'No');
    console.log('\nPayload:');
    console.log(JSON.stringify(alert.payload, null, 2));
    console.log('\n');
  }
}

main().finally(() => prisma.$disconnect());
