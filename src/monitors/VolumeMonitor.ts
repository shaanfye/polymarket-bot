import { BaseMonitor } from './base/Monitor.js';
import { Alert } from '../types/alerts.js';
import { GammaApiClient } from '../api/GammaApiClient.js';
import { DataApiClient } from '../api/DataApiClient.js';
import { StatisticalAnalyzer } from '../services/StatisticalAnalyzer.js';
import { TradeRepository } from '../db/repositories/TradeRepository.js';
import { MarketRepository } from '../db/repositories/MarketRepository.js';
import { parseTradeSize, parseVolume24hr } from '../api/types.js';

export interface VolumeMonitorConfig {
  enabled: boolean;
  stdDeviationThreshold: number;
  timeWindowHours: number;
}

export class VolumeMonitor extends BaseMonitor {
  name = 'VolumeMonitor';

  private gammaClient: GammaApiClient;
  private dataClient: DataApiClient;
  private analyzer: StatisticalAnalyzer;
  private tradeRepo: TradeRepository;
  private marketRepo: MarketRepository;
  private config: VolumeMonitorConfig;

  constructor(config: VolumeMonitorConfig) {
    super();
    this.config = config;
    this.enabled = config.enabled;
    this.gammaClient = new GammaApiClient();
    this.dataClient = new DataApiClient();
    this.analyzer = new StatisticalAnalyzer();
    this.tradeRepo = new TradeRepository();
    this.marketRepo = new MarketRepository();
  }

  async run(): Promise<Alert[]> {
    if (!this.enabled) {
      this.log('Monitor disabled, skipping...');
      return [];
    }

    this.log('Starting volume outlier detection...');

    try {
      const alerts: Alert[] = [];

      const markets = await this.gammaClient.getActiveMarkets(100);
      this.log(`Fetched ${markets.length} active markets`);

      for (const market of markets) {
        try {
          await this.marketRepo.upsert({
            conditionId: market.conditionId,
            slug: market.slug,
            title: market.question,
            volume24hr: parseVolume24hr(market),
          });

          const dbMarket = await this.marketRepo.findByConditionId(market.conditionId);
          if (!dbMarket) continue;

          const recentTrades = await this.tradeRepo.findByMarket(
            dbMarket.id,
            500,
            new Date(Date.now() - this.config.timeWindowHours * 60 * 60 * 1000)
          );

          if (recentTrades.length < 10) continue;

          const tradeSizes = recentTrades.map((t) => t.usdcSize);

          const lastTrade = recentTrades[0];
          const outlierResult = this.analyzer.detectOutlier(
            lastTrade.usdcSize,
            tradeSizes,
            this.config.stdDeviationThreshold
          );

          if (outlierResult.isOutlier) {
            this.log(
              `Outlier detected on ${market.slug}: $${lastTrade.usdcSize} (${outlierResult.stdDeviations.toFixed(2)}σ)`
            );

            alerts.push({
              type: 'VOLUME_OUTLIER',
              severity: this.calculateSeverity(outlierResult.stdDeviations),
              title: `Large trade detected on ${market.question}`,
              timestamp: new Date(),
              data: {
                market: {
                  slug: market.slug,
                  title: market.question,
                  conditionId: market.conditionId,
                },
                trade: {
                  size: lastTrade.size,
                  usdcSize: lastTrade.usdcSize,
                  price: lastTrade.price,
                  side: lastTrade.side,
                  userAddress: lastTrade.userAddress,
                  transactionHash: lastTrade.transactionHash,
                  timestamp: lastTrade.timestamp.toISOString(),
                },
                statistics: {
                  mean: outlierResult.mean,
                  stdDev: outlierResult.stdDev,
                  stdDeviations: outlierResult.stdDeviations,
                  threshold: outlierResult.threshold,
                },
              },
            });
          }
        } catch (error) {
          this.error(`Error processing market ${market.slug}:`, error);
        }
      }

      this.log(`Volume monitor completed. Found ${alerts.length} outliers.`);
      return alerts;
    } catch (error) {
      this.error('Error running volume monitor:', error);
      return [];
    }
  }

  private calculateSeverity(stdDeviations: number): 'low' | 'medium' | 'high' {
    if (stdDeviations > 4) return 'high';
    if (stdDeviations > 3) return 'medium';
    return 'low';
  }
}
