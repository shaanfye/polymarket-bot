import { prisma } from '../client.js';
import { MarketSnapshot } from '@prisma/client';

export interface CreateMarketSnapshotParams {
  conditionId: string;
  openInterest: number;
  liveVolume: number;
  yesHolders: number;
  noHolders: number;
  yesConcentration: number;
  noConcentration: number;
  yesSidePnL: number;
  noSidePnL: number;
  probability: number;
}

export class MarketSnapshotRepository {
  async create(params: CreateMarketSnapshotParams): Promise<MarketSnapshot> {
    return prisma.marketSnapshot.create({
      data: {
        conditionId: params.conditionId,
        openInterest: params.openInterest,
        liveVolume: params.liveVolume,
        yesHolders: params.yesHolders,
        noHolders: params.noHolders,
        yesConcentration: params.yesConcentration,
        noConcentration: params.noConcentration,
        yesSidePnL: params.yesSidePnL,
        noSidePnL: params.noSidePnL,
        probability: params.probability,
      },
    });
  }

  async getLatest(conditionId: string): Promise<MarketSnapshot | null> {
    return prisma.marketSnapshot.findFirst({
      where: { conditionId },
      orderBy: { snapshotTime: 'desc' },
    });
  }

  async getRecent(conditionId: string, limit: number = 24): Promise<MarketSnapshot[]> {
    return prisma.marketSnapshot.findMany({
      where: { conditionId },
      orderBy: { snapshotTime: 'desc' },
      take: limit,
    });
  }

  async deleteOld(daysToKeep: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await prisma.marketSnapshot.deleteMany({
      where: {
        snapshotTime: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
