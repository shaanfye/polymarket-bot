import { BaseMonitor } from './base/Monitor.js';
import { Alert } from '../types/alerts.js';
import { DataApiClient } from '../api/DataApiClient.js';
import { GammaApiClient } from '../api/GammaApiClient.js';
import { MarketRepository } from '../db/repositories/MarketRepository.js';
import { MarketSnapshotRepository } from '../db/repositories/MarketSnapshotRepository.js';
import { SmartMoneyAnalyzer } from '../services/SmartMoneyAnalyzer.js';
import { parseProbability } from '../api/types.js';

export interface SmartMoneyMonitorConfig {
  enabled: boolean;
  intervalMinutes: number; // Run every N minutes (default 60)
}

export class SmartMoneyMonitor extends BaseMonitor {
  name = 'SmartMoneyMonitor';

  private dataClient: DataApiClient;
  private gammaClient: GammaApiClient;
  private marketRepo: MarketRepository;
  private snapshotRepo: MarketSnapshotRepository;
  private analyzer: SmartMoneyAnalyzer;
  private config: SmartMoneyMonitorConfig;
  private lastRunTime: Date;

  constructor(config: SmartMoneyMonitorConfig) {
    super();
    this.config = config;
    this.enabled = config.enabled;
    this.dataClient = new DataApiClient();
    this.gammaClient = new GammaApiClient();
    this.marketRepo = new MarketRepository();
    this.snapshotRepo = new MarketSnapshotRepository();
    this.analyzer = new SmartMoneyAnalyzer();
    this.lastRunTime = new Date(0); // Start from epoch to run on first cycle
  }

  async run(): Promise<Alert[]> {
    if (!this.enabled) {
      this.log('Monitor disabled, skipping...');
      return [];
    }

    const now = new Date();
    const minutesSinceLastRun = (now.getTime() - this.lastRunTime.getTime()) / (1000 * 60);

    if (minutesSinceLastRun < this.config.intervalMinutes) {
      return [];
    }

    this.log('Starting smart money analysis...');

    try {
      const alerts: Alert[] = [];
      const trackedMarkets = await this.marketRepo.getTrackedMarkets();

      if (trackedMarkets.length === 0) {
        this.log('No tracked markets configured');
        return [];
      }

      this.log(`Analyzing ${trackedMarkets.length} markets for smart money...`);

      for (const trackedMarket of trackedMarkets) {
        try {
          // Get current market data
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

          // Calculate side P&L (includes updated holder distribution with P&L)
          const sidePnL = await this.analyzer.calculateSidePnL(trackedMarket.conditionId);
          const holderDistribution = sidePnL.distribution;

          // Get open interest
          let openInterest = 0;
          try {
            const oiData = await this.dataClient.getOpenInterest([trackedMarket.conditionId]);
            if (oiData.length > 0) {
              openInterest = oiData[0].value;
            }
          } catch (error) {
            this.log(`Could not fetch open interest: ${error}`);
          }

          // Get live volume
          let liveVolume = 0;
          if (trackedMarket.eventId) {
            try {
              const volumeData = await this.dataClient.getLiveVolume(trackedMarket.eventId);
              if (volumeData) {
                const marketVolume = volumeData.markets.find(
                  (m) => m.market === trackedMarket.conditionId
                );
                if (marketVolume) {
                  liveVolume = marketVolume.value;
                  this.log(`Live volume for ${trackedMarket.name}: $${liveVolume.toFixed(0)}`);
                } else {
                  this.log(`Market ${trackedMarket.conditionId} not found in volume data`);
                }
              } else {
                this.log(`No volume data returned for eventId ${trackedMarket.eventId}`);
              }
            } catch (error) {
              this.error(`Could not fetch live volume for eventId ${trackedMarket.eventId}:`, error);
            }
          } else {
            this.log(`No eventId configured for market ${trackedMarket.name}, skipping live volume`);
          }

          const currentProbability = parseProbability(gammaMarket.outcomePrices[0]);

          // Save snapshot
          await this.snapshotRepo.create({
            conditionId: trackedMarket.conditionId,
            openInterest,
            liveVolume,
            yesHolders: holderDistribution.yesHolders.length,
            noHolders: holderDistribution.noHolders.length,
            yesConcentration: holderDistribution.yesConcentration,
            noConcentration: holderDistribution.noConcentration,
            yesSidePnL: sidePnL.yesSidePnL,
            noSidePnL: sidePnL.noSidePnL,
            probability: currentProbability,
          });

          // Get previous snapshot for comparison
          const previousSnapshot = await this.snapshotRepo.getLatest(trackedMarket.conditionId);

          let changes = null;
          if (previousSnapshot) {
            changes = {
              openInterestChange: openInterest - previousSnapshot.openInterest,
              volumeChange: liveVolume - previousSnapshot.liveVolume,
              pnlShift: this.detectPnLShift(sidePnL, previousSnapshot),
            };
          }

          // Generate analysis
          const analysis = this.generateSmartMoneyAnalysis(sidePnL, holderDistribution, changes);

          // Create alert
          alerts.push({
            type: 'SMART_MONEY_REPORT',
            severity: 'low',
            title: `Smart Money Report: ${gammaMarket.question}`,
            timestamp: now,
            data: {
              market: {
                slug: gammaMarket.slug,
                title: gammaMarket.question,
                conditionId: trackedMarket.conditionId,
                outcomes: gammaMarket.outcomes,
              },
              openInterest: {
                current: openInterest,
                change: changes?.openInterestChange || 0,
              },
              volume: {
                current: liveVolume,
                change: changes?.volumeChange || 0,
              },
              holderDistribution: {
                yes: {
                  topHolders: holderDistribution.yesHolders.slice(0, 20),
                  concentration: holderDistribution.yesConcentration,
                  totalAmount: holderDistribution.totalYesAmount,
                  count: holderDistribution.yesHolders.length,
                },
                no: {
                  topHolders: holderDistribution.noHolders.slice(0, 20),
                  concentration: holderDistribution.noConcentration,
                  totalAmount: holderDistribution.totalNoAmount,
                  count: holderDistribution.noHolders.length,
                },
              },
              sidePnL: {
                yes: {
                  totalPnL: sidePnL.yesSidePnL,
                  avgPnL: sidePnL.yesSideAvgPnL,
                },
                no: {
                  totalPnL: sidePnL.noSidePnL,
                  avgPnL: sidePnL.noSideAvgPnL,
                },
                smarterSide: sidePnL.smarterSide,
                analysis,
              },
              hourOverHour: changes ? {
                openInterestTrend: changes.openInterestChange > 0 ? 'INCREASING' : 'DECREASING',
                volumeTrend: changes.volumeChange > 0 ? 'INCREASING' : 'DECREASING',
                smartMoneyShift: changes.pnlShift,
              } : null,
            },
          });

          this.log(
            `Smart money report: ${gammaMarket.slug} - ${sidePnL.smarterSide} side has better P&L (avg: $${sidePnL.smarterSide === 'YES' ? sidePnL.yesSideAvgPnL.toFixed(0) : sidePnL.noSideAvgPnL.toFixed(0)})`
          );
        } catch (error) {
          this.error(`Error analyzing market ${trackedMarket.name}:`, error);
        }
      }

      this.lastRunTime = now;

      this.log(`Smart money monitor completed. Generated ${alerts.length} reports.`);
      return alerts;
    } catch (error) {
      this.error('Error running smart money monitor:', error);
      return [];
    }
  }

  private detectPnLShift(
    currentPnL: { yesSidePnL: number; noSidePnL: number },
    previousSnapshot: any
  ): string {
    const prevYesPnL = previousSnapshot.yesSidePnL;
    const prevNoPnL = previousSnapshot.noSidePnL;

    const yesPnLChange = currentPnL.yesSidePnL - prevYesPnL;
    const noPnLChange = currentPnL.noSidePnL - prevNoPnL;

    if (Math.abs(yesPnLChange) < 1000 && Math.abs(noPnLChange) < 1000) {
      return 'No significant P&L shift';
    }

    if (yesPnLChange > noPnLChange * 2) {
      return `Yes side P&L improving (+$${yesPnLChange.toFixed(0)})`;
    } else if (noPnLChange > yesPnLChange * 2) {
      return `No side P&L improving (+$${noPnLChange.toFixed(0)})`;
    }

    return `Both sides P&L changing (Yes: $${yesPnLChange.toFixed(0)}, No: $${noPnLChange.toFixed(0)})`;
  }

  private generateSmartMoneyAnalysis(
    sidePnL: any,
    holderDist: any,
    changes: any
  ): string {
    const insights: string[] = [];

    // Which side has smarter money
    insights.push(
      `${sidePnL.smarterSide} side has more profitable traders (avg P&L: $${(sidePnL.smarterSide === 'YES' ? sidePnL.yesSideAvgPnL : sidePnL.noSideAvgPnL).toFixed(0)})`
    );

    // Concentration analysis
    if (holderDist.yesConcentration > 70) {
      insights.push(`Yes side highly concentrated (${holderDist.yesConcentration.toFixed(1)}% in top 5)`);
    }
    if (holderDist.noConcentration > 70) {
      insights.push(`No side highly concentrated (${holderDist.noConcentration.toFixed(1)}% in top 5)`);
    }

    // Changes
    if (changes?.pnlShift && !changes.pnlShift.includes('No significant')) {
      insights.push(changes.pnlShift);
    }

    return insights.join('. ');
  }
}
