import { prisma } from '../client.js';
import { TrackedAccount } from '@prisma/client';

export class TrackedAccountRepository {
  async create(data: {
    address: string;
    name?: string;
    enabled?: boolean;
  }): Promise<TrackedAccount> {
    return prisma.trackedAccount.create({ data });
  }

  async findAll(): Promise<TrackedAccount[]> {
    return prisma.trackedAccount.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByAddress(address: string): Promise<TrackedAccount | null> {
    return prisma.trackedAccount.findUnique({
      where: { address },
    });
  }

  async upsert(data: {
    address: string;
    name?: string;
    enabled?: boolean;
  }): Promise<TrackedAccount> {
    return prisma.trackedAccount.upsert({
      where: { address: data.address },
      create: data,
      update: {
        name: data.name,
        enabled: data.enabled,
      },
    });
  }
}
