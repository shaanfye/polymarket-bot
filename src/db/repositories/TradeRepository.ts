import { prisma } from '../client.js';
import { Trade } from '@prisma/client';

export class TradeRepository {
  async create(data: {
    transactionHash: string;
    userAddress: string;
    marketId: string;
    size: number;
    usdcSize: number;
    price: number;
    side: string;
    timestamp: Date;
  }): Promise<Trade> {
    return prisma.trade.create({ data });
  }

  async upsert(data: {
    transactionHash: string;
    userAddress: string;
    marketId: string;
    size: number;
    usdcSize: number;
    price: number;
    side: string;
    timestamp: Date;
  }): Promise<Trade> {
    return prisma.trade.upsert({
      where: { transactionHash: data.transactionHash },
      create: data,
      update: data,
    });
  }

  async findByMarket(
    marketId: string,
    limit: number = 100,
    startTime?: Date
  ): Promise<Trade[]> {
    return prisma.trade.findMany({
      where: {
        marketId,
        ...(startTime && { timestamp: { gte: startTime } }),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async findByUser(
    userAddress: string,
    limit: number = 100,
    startTime?: Date
  ): Promise<Trade[]> {
    return prisma.trade.findMany({
      where: {
        userAddress,
        ...(startTime && { timestamp: { gte: startTime } }),
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async findRecent(limit: number = 100, hoursAgo: number = 24): Promise<Trade[]> {
    const startTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

    return prisma.trade.findMany({
      where: {
        timestamp: { gte: startTime },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        market: true,
      },
    });
  }

  async getLatestTimestamp(): Promise<Date | null> {
    const latest = await prisma.trade.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    return latest?.timestamp ?? null;
  }
}
