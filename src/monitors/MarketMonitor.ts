import { BaseMonitor } from './base/Monitor.js';
import { Alert } from '../types/alerts.js';
import { GammaApiClient } from '../api/GammaApiClient.js';
import { MarketRepository } from '../db/repositories/MarketRepository.js';
import { PriceSnapshotRepository } from '../db/repositories/PriceSnapshotRepository.js';
import { parseProbability, parseVolume24hr } from '../api/types.js';

export interface MarketMonitorConfig {
  enabled: boolean;
  changeThresholdPercent: number;
  updateIntervalMinutes: number;
}

export class MarketMonitor extends BaseMonitor {
  name = 'MarketMonitor';

  private gammaClient: GammaApiClient;
  private marketRepo: MarketRepository;
  private snapshotRepo: PriceSnapshotRepository;
  private config: MarketMonitorConfig;
  private lastUpdateTime: Date;

  constructor(config: MarketMonitorConfig) {
    super();
    this.config = config;
    this.enabled = config.enabled;
    this.gammaClient = new GammaApiClient();
    this.marketRepo = new MarketRepository();
    this.snapshotRepo = new PriceSnapshotRepository();
    this.lastUpdateTime = new Date(0);
  }

  async run(): Promise<Alert[]> {
    if (!this.enabled) {
      this.log('Monitor disabled, skipping...');
      return [];
    }

    const now = new Date();
    const minutesSinceLastUpdate =
      (now.getTime() - this.lastUpdateTime.getTime()) / (1000 * 60);

    if (minutesSinceLastUpdate < this.config.updateIntervalMinutes) {
      return [];
    }

    this.log('Starting tracked market monitoring...');

    try {
      const alerts: Alert[] = [];
      const trackedMarkets = await this.marketRepo.getTrackedMarkets();

      if (trackedMarkets.length === 0) {
        this.log('No tracked markets configured');
        return [];
      }

      this.log(`Monitoring ${trackedMarkets.length} tracked markets...`);

      for (const trackedMarket of trackedMarkets) {
        try {
          let gammaMarket = await this.gammaClient.getMarketByConditionId(
            trackedMarket.conditionId
          );

          // If not found by condition ID, try searching by market name/slug
          if (!gammaMarket && trackedMarket.name) {
            const slug = trackedMarket.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '');

            // Try to get the event first
            const event = await this.gammaClient.getEventBySlug(slug);
            if (event && event.markets && event.markets.length > 0) {
              // Find the market with matching condition ID
              const foundMarket = event.markets.find((m) => m.conditionId === trackedMarket.conditionId);
              if (foundMarket) {
                gammaMarket = foundMarket;
              }
            }
          }

          if (!gammaMarket) {
            this.log(`Market ${trackedMarket.name || trackedMarket.conditionId} not found in Gamma API`);
            continue;
          }

          const dbMarket = await this.marketRepo.upsert({
            conditionId: trackedMarket.conditionId,
            slug: gammaMarket.slug,
            title: gammaMarket.question,
            volume24hr: parseVolume24hr(gammaMarket),
          });

          const currentProbability = parseProbability(gammaMarket.outcomePrices[0]);

          await this.snapshotRepo.create({
            marketId: dbMarket.id,
            probability: currentProbability,
            timestamp: now,
          });

          const previousSnapshot = await this.snapshotRepo.getPreviousSnapshot(
            dbMarket.id,
            this.config.updateIntervalMinutes
          );

          if (previousSnapshot) {
            const probabilityChange = Math.abs(
              currentProbability - previousSnapshot.probability
            );
            const percentChange =
              (probabilityChange / previousSnapshot.probability) * 100;

            if (percentChange >= this.config.changeThresholdPercent) {
              this.log(
                `Probability shift detected on ${gammaMarket.slug}: ${(previousSnapshot.probability * 100).toFixed(1)}% → ${(currentProbability * 100).toFixed(1)}%`
              );

              alerts.push({
                type: 'PROBABILITY_SHIFT',
                severity: this.calculateSeverity(percentChange),
                title: `Probability shift on ${gammaMarket.question}`,
                timestamp: now,
                data: {
                  market: {
                    slug: gammaMarket.slug,
                    title: gammaMarket.question,
                    conditionId: trackedMarket.conditionId,
                    outcomes: gammaMarket.outcomes,
                  },
                  probability: {
                    previous: previousSnapshot.probability,
                    current: currentProbability,
                    change: probabilityChange,
                    percentChange,
                  },
                  volume24hr: parseVolume24hr(gammaMarket),
                },
              });
            }
          }

          const shouldSendUpdate =
            minutesSinceLastUpdate >= this.config.updateIntervalMinutes;

          if (shouldSendUpdate) {
            alerts.push({
              type: 'MARKET_UPDATE',
              severity: 'low',
              title: `Market update: ${gammaMarket.question}`,
              timestamp: now,
              data: {
                market: {
                  slug: gammaMarket.slug,
                  title: gammaMarket.question,
                  conditionId: trackedMarket.conditionId,
                  outcomes: gammaMarket.outcomes,
                },
                probability: currentProbability,
                outcomePrices: gammaMarket.outcomePrices.map(parseProbability),
                volume24hr: parseVolume24hr(gammaMarket),
              },
            });
          }
        } catch (error) {
          this.error(`Error monitoring market ${trackedMarket.name || trackedMarket.conditionId}:`, error);
        }
      }

      this.lastUpdateTime = now;

      this.log(`Market monitor completed. Generated ${alerts.length} alerts.`);
      return alerts;
    } catch (error) {
      this.error('Error running market monitor:', error);
      return [];
    }
  }

  private calculateSeverity(percentChange: number): 'low' | 'medium' | 'high' {
    if (percentChange > 20) return 'high';
    if (percentChange > 10) return 'medium';
    return 'low';
  }
}
