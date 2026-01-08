import { prisma } from '../client.js';
import { Market, TrackedMarket } from '@prisma/client';

export class MarketRepository {
  async upsert(data: {
    conditionId: string;
    slug: string;
    title: string;
    volume24hr: number;
  }): Promise<Market> {
    return prisma.market.upsert({
      where: { conditionId: data.conditionId },
      create: data,
      update: {
        slug: data.slug,
        title: data.title,
        volume24hr: data.volume24hr,
      },
    });
  }

  async findByConditionId(conditionId: string): Promise<Market | null> {
    return prisma.market.findUnique({
      where: { conditionId },
    });
  }

  async findBySlug(slug: string): Promise<Market | null> {
    return prisma.market.findUnique({
      where: { slug },
    });
  }

  async findAll(): Promise<Market[]> {
    return prisma.market.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTrackedMarkets(): Promise<TrackedMarket[]> {
    return prisma.trackedMarket.findMany({
      where: { enabled: true },
    });
  }
}
