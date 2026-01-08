import { prisma } from '../client.js';
import { Alert } from '@prisma/client';
import { Alert as AlertType } from '../../types/alerts.js';
import { Prisma } from '@prisma/client';

export class AlertRepository {
  async create(alert: AlertType): Promise<Alert> {
    return prisma.alert.create({
      data: {
        type: alert.type,
        payload: {
          severity: alert.severity,
          title: alert.title,
          data: alert.data,
          timestamp: alert.timestamp.toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  async findPendingWebhooks(limit: number = 50): Promise<Alert[]> {
    return prisma.alert.findMany({
      where: {
        webhookSent: false,
        retryCount: { lt: 3 },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markAsSent(id: string): Promise<Alert> {
    return prisma.alert.update({
      where: { id },
      data: {
        webhookSent: true,
        sentAt: new Date(),
      },
    });
  }

  async incrementRetryCount(id: string): Promise<Alert> {
    return prisma.alert.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
      },
    });
  }

  async findRecent(limit: number = 100): Promise<Alert[]> {
    return prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
