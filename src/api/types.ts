import { z } from 'zod';

// ============================================================================
// Gamma API Types (Markets & Events)
// ============================================================================

export const GammaMarketSchema = z.object({
  id: z.string(),
  conditionId: z.string(),
  slug: z.string(),
  question: z.string(),
  description: z.string().optional(),
  endDate: z.string().optional(),
  outcomes: z.union([z.array(z.string()), z.string()]).transform((val) =>
    typeof val === 'string' ? JSON.parse(val) : val
  ),
  outcomePrices: z.union([z.array(z.string()), z.string()]).transform((val) =>
    typeof val === 'string' ? JSON.parse(val) : val
  ),
  volume: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  volume24hr: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  liquidity: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  active: z.boolean().optional(),
  closed: z.boolean().optional(),
  archived: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  icon: z.string().optional(),
});

export const GammaEventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  markets: z.array(GammaMarketSchema).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  volume: z.union([z.string(), z.number()]).transform((val) => String(val)).optional(),
  active: z.boolean().optional(),
  closed: z.boolean().optional(),
  archived: z.boolean().optional(),
  negRisk: z.boolean().optional(),
});

export type GammaMarket = z.infer<typeof GammaMarketSchema>;
export type GammaEvent = z.infer<typeof GammaEventSchema>;

// ============================================================================
// Data API Types (Activity & Trades)
// ============================================================================

export const DataApiActivitySchema = z.object({
  id: z.string(),
  proxyWallet: z.string(),
  timestamp: z.number(),
  conditionId: z.string(),
  type: z.enum(['TRADE', 'SPLIT', 'MERGE', 'REDEEM', 'REWARD', 'CONVERSION']),
  size: z.string(),
  usdcSize: z.string(),
  transactionHash: z.string(),
  price: z.string().optional(),
  asset: z.string().optional(),
  side: z.enum(['BUY', 'SELL']).optional(),
  outcomeIndex: z.number().optional(),
  market: z.object({
    conditionId: z.string(),
    slug: z.string(),
    title: z.string(),
    icon: z.string().optional(),
    eventSlug: z.string().optional(),
    outcome: z.string().optional(),
  }).optional(),
  user: z.object({
    name: z.string().optional(),
    pseudonym: z.string().optional(),
    bio: z.string().optional(),
    profileImage: z.string().optional(),
    profileImageOptimized: z.string().optional(),
  }).optional(),
});

export const DataApiActivityResponseSchema = z.array(DataApiActivitySchema);

export type DataApiActivity = z.infer<typeof DataApiActivitySchema>;
export type DataApiActivityResponse = z.infer<typeof DataApiActivityResponseSchema>;

// ============================================================================
// CLOB API Types (Prices)
// ============================================================================

export const ClobPriceSchema = z.object({
  price: z.string(),
  size: z.string().optional(),
});

export type ClobPrice = z.infer<typeof ClobPriceSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

export function toNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseVolume24hr(market: GammaMarket): number {
  return toNumber(market.volume24hr);
}

export function parseProbability(priceString: string | undefined): number {
  if (!priceString) return 0;
  return toNumber(priceString);
}

export function parseTradeSize(activity: DataApiActivity): number {
  return toNumber(activity.usdcSize);
}
