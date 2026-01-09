import { BaseMonitor } from './base/Monitor.js';
import { Alert } from '../types/alerts.js';
import { DataApiClient } from '../api/DataApiClient.js';
import { GammaApiClient } from '../api/GammaApiClient.js';
import { MarketRepository } from '../db/repositories/MarketRepository.js';
import { TraderIntelligenceService } from '../services/TraderIntelligenceService.js';
import { parseProbability } from '../api/types.js';

export interface TradeMonitorConfig {
  enabled: boolean;
  largeTradeThreshold: number;     // e.g., 10 USDC
  whalePnlThreshold: number;       // e.g., 100000 USDC
  includeTraderIntel: boolean;     // Fetch trader P&L and position
}

export class TradeMonitor extends BaseMonitor {
  name = 'TradeMonitor';

  private dataClient: DataApiClient;
  private gammaClient: GammaApiClient;
  private marketRepo: MarketRepository;
  private traderIntel: TraderIntelligenceService;
  private config: TradeMonitorConfig;
  private lastProcessedTrades: Map<string, number> = new Map(); // conditionId -> last timestamp
  private knownWhales: Set<string> = new Set(); // Track large traders
  private traderCache: Map<string, any> = new Map(); // Cache trader data during run

  constructor(config: TradeMonitorConfig) {
    super();
    this.config = config;
    this.enabled = config.enabled;
    this.dataClient = new DataApiClient();
    this.gammaClient = new GammaApiClient();
    this.marketRepo = new MarketRepository();
    this.traderIntel = new TraderIntelligenceService();
  }

  async run(): Promise<Alert[]> {
    if (!this.enabled) {
      this.log('Monitor disabled, skipping...');
      return [];
    }

    this.log('Starting trade monitoring for tracked markets...');

    try {
      const alerts: Alert[] = [];
      const trackedMarkets = await this.marketRepo.getTrackedMarkets();

      if (trackedMarkets.length === 0) {
        this.log('No tracked markets configured');
        return [];
      }

      this.log(`Monitoring trades for ${trackedMarkets.length} markets...`);

      // Clear trader cache for this run
      this.traderCache.clear();

      for (const trackedMarket of trackedMarkets) {
        try {
          // Get current market data for probability
          let gammaMarket = await this.gammaClient.getMarketByConditionId(
            trackedMarket.conditionId
          );

          if (!gammaMarket && trackedMarket.name) {
            const slug = trackedMarket.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '');
            const event = await this.gammaClient.getEventBySlug(slug);
            if (event && event.markets && event.markets.length > 0) {
              const foundMarket = event.markets.find((m) => m.conditionId === trackedMarket.conditionId);
              if (foundMarket) {
                gammaMarket = foundMarket;
              }
            }
          }

          if (!gammaMarket) {
            this.log(`Market ${trackedMarket.name || trackedMarket.conditionId} not found`);
            continue;
          }

          // Fetch recent trades from Data API
          const lastTimestamp = this.lastProcessedTrades.get(trackedMarket.conditionId) || Date.now() - 5 * 60 * 1000; // Last 5 minutes on first run
          const trades = await this.dataClient.getMarketTradesRaw(
            trackedMarket.conditionId,
            100,
            Math.floor(lastTimestamp / 1000)
          );

          const newTrades = trades.filter(
            (t: any) => t.timestamp > lastTimestamp / 1000
          );

          this.log(`Found ${newTrades.length} new trades for ${gammaMarket.slug}`);

          for (const trade of newTrades) {
            const tradeSize = trade.size * trade.price; // Calculate USDC size
            const currentProbability = parseProbability(gammaMarket.outcomePrices[0]);
            const tradePrice = trade.price ? parseFloat(trade.price) : 0;

            // Track users who make very large trades (>=$100k) as whales
            if (tradeSize >= this.config.whalePnlThreshold) {
              this.knownWhales.add(trade.proxyWallet);
              this.log(`Added whale trader: ${trade.proxyWallet.slice(0, 8)}... (trade size: $${tradeSize.toFixed(0)})`);
            }

            // Check for trades >= threshold ($10 by default)
            if (tradeSize >= this.config.largeTradeThreshold) {
              const isWhale = this.knownWhales.has(trade.proxyWallet);
              const outcome = trade.outcome || gammaMarket.outcomes[trade.outcomeIndex || 0];

              // Get trader intelligence if enabled
              let traderData = null;
              if (this.config.includeTraderIntel) {
                traderData = await this.getTraderData(trade.proxyWallet, trackedMarket.conditionId);
              }

              const alertType = isWhale ? 'WHALE_ACTIVITY' : 'LARGE_TRADE';
              const title = isWhale
                ? `Whale trader active on ${gammaMarket.question}`
                : `Trade on ${gammaMarket.question}`;

              alerts.push({
                type: alertType,
                severity: this.calculateTradeSeverity(tradeSize),
                title,
                timestamp: new Date(),
                data: {
                  market: {
                    slug: gammaMarket.slug,
                    title: gammaMarket.question,
                    conditionId: trackedMarket.conditionId,
                    outcomes: gammaMarket.outcomes,
                  },
                  trade: {
                    size: tradeSize,
                    side: trade.side,
                    outcome,
                    price: tradePrice,
                    userAddress: trade.proxyWallet,
                    transactionHash: trade.transactionHash,
                    timestamp: new Date(trade.timestamp * 1000).toISOString(),
                  },
                  trader: traderData,
                  currentProbability,
                  outcomePrices: gammaMarket.outcomePrices.map(parseProbability),
                  isKnownWhale: isWhale,
                },
              });

              this.log(
                `${isWhale ? 'Whale' : 'Trade'}: $${tradeSize.toFixed(2)} ${trade.side} on ${gammaMarket.slug}${
                  traderData ? ` (P&L: $${traderData.lifetimePnL.toFixed(0)})` : ''
                }`
              );
            }
          }

          // Update last processed timestamp
          if (newTrades.length > 0) {
            const latestTimestamp = Math.max(...newTrades.map((t) => t.timestamp));
            this.lastProcessedTrades.set(trackedMarket.conditionId, latestTimestamp * 1000);
          }
        } catch (error) {
          this.error(`Error monitoring trades for market ${trackedMarket.name}:`, error);
        }
      }

      this.log(`Trade monitor completed. Generated ${alerts.length} alerts.`);
      return alerts;
    } catch (error) {
      this.error('Error running trade monitor:', error);
      return [];
    }
  }

  private async getTraderData(userAddress: string, conditionId: string): Promise<any> {
    // Check cache first
    if (this.traderCache.has(userAddress)) {
      return this.traderCache.get(userAddress);
    }

    try {
      const [pnl, position] = await Promise.all([
        this.traderIntel.getTraderLifetimePnL(userAddress),
        this.traderIntel.getTraderPosition(userAddress, conditionId),
      ]);

      const name = await this.traderIntel.getTraderName(userAddress);

      const traderData = {
        address: userAddress,
        name,
        lifetimePnL: pnl.totalPnl,
        realizedPnL: pnl.totalRealizedPnl,
        unrealizedPnL: pnl.totalCashPnl,
        positionSize: position?.size || 0,
        positionValue: position?.currentValue || 0,
        openPositions: pnl.openPositionsCount,
        closedPositions: pnl.closedPositionsCount,
      };

      // Cache for this run
      this.traderCache.set(userAddress, traderData);

      return traderData;
    } catch (error) {
      console.error(`Error fetching trader data for ${userAddress}:`, error);
      return {
        address: userAddress,
        name: `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`,
        lifetimePnL: 0,
        positionSize: 0,
      };
    }
  }

  private calculateTradeSeverity(size: number): 'low' | 'medium' | 'high' {
    if (size > 50000) return 'high';
    if (size > 10000) return 'medium';
    if (size > 1000) return 'medium';
    return 'low';
  }
}
