import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  console.log('📨 Recent Alert Payloads:\n');
  
  for (const alert of alerts) {
    console.log('═'.repeat(60));
    console.log('Alert Type:', alert.type);
    console.log('Created:', alert.createdAt);
    console.log('Sent:', alert.webhookSent ? 'Yes' : 'No');
    console.log('\nPayload sent to webhook:');
    console.log(JSON.stringify(alert.payload, null, 2));
    console.log('\n');
  }
}

main().finally(() => prisma.$disconnect());
