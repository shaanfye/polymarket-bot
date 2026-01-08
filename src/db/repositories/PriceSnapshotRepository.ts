import { prisma } from '../client.js';
import { PriceSnapshot } from '@prisma/client';

export class PriceSnapshotRepository {
  async create(data: {
    marketId: string;
    probability: number;
    timestamp: Date;
  }): Promise<PriceSnapshot> {
    return prisma.priceSnapshot.create({ data });
  }

  async getLatestForMarket(marketId: string): Promise<PriceSnapshot | null> {
    return prisma.priceSnapshot.findFirst({
      where: { marketId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getPreviousSnapshot(
    marketId: string,
    minutesAgo: number
  ): Promise<PriceSnapshot | null> {
    const targetTime = new Date(Date.now() - minutesAgo * 60 * 1000);

    return prisma.priceSnapshot.findFirst({
      where: {
        marketId,
        timestamp: { lte: targetTime },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getSnapshotHistory(
    marketId: string,
    hoursAgo: number = 24
  ): Promise<PriceSnapshot[]> {
    const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    return prisma.priceSnapshot.findMany({
      where: {
        marketId,
        timestamp: { gte: startTime },
      },
      orderBy: { timestamp: 'asc' },
    });
  }
}
