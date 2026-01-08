import { z } from 'zod';

export const ConfigSchema = z.object({
  polling: z.object({
    intervalMinutes: z.number().min(0.5).max(60).default(1.5),
  }),
  webhook: z.object({
    url: z.string().url(),
    retryAttempts: z.number().min(0).max(10).default(3),
    timeoutMs: z.number().min(1000).max(30000).default(5000),
  }),
  monitoring: z.object({
    volumeOutlier: z.object({
      enabled: z.boolean().default(true),
      stdDeviationThreshold: z.number().min(1).max(5).default(2),
      timeWindowHours: z.number().min(1).max(168).default(24),
    }),
    accountActivity: z.object({
      enabled: z.boolean().default(true),
      pollIntervalMinutes: z.number().min(0.5).max(60).default(1.5),
    }),
    marketProbability: z.object({
      enabled: z.boolean().default(true),
      changeThresholdPercent: z.number().min(1).max(50).default(5),
      updateIntervalMinutes: z.number().min(1).max(60).default(10),
    }),
    tradeActivity: z.object({
      enabled: z.boolean().default(true),
      largeTradeThreshold: z.number().min(100).max(1000000).default(1000),
      whalePnlThreshold: z.number().min(10000).max(10000000).default(100000),
    }).default({
      enabled: true,
      largeTradeThreshold: 1000,
      whalePnlThreshold: 100000,
    }),
  }),
  database: z.object({
    url: z.string(),
  }),
});

export const TrackedConfigSchema = z.object({
  accounts: z.array(
    z.object({
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      name: z.string().optional(),
      enabled: z.boolean().default(true),
    })
  ).default([]),
  markets: z.array(
    z.object({
      conditionId: z.string(),
      name: z.string().optional(),
      enabled: z.boolean().default(true),
    })
  ).default([]),
});

export type Config = z.infer<typeof ConfigSchema>;
export type TrackedConfig = z.infer<typeof TrackedConfigSchema>;
