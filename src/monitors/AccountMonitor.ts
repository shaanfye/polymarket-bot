import { BaseMonitor } from './base/Monitor.js';
import { Alert } from '../types/alerts.js';
import { DataApiClient } from '../api/DataApiClient.js';
import { TrackedAccountRepository } from '../db/repositories/TrackedAccountRepository.js';
import { TradeRepository } from '../db/repositories/TradeRepository.js';
import { MarketRepository } from '../db/repositories/MarketRepository.js';
import { parseTradeSize } from '../api/types.js';

export interface AccountMonitorConfig {
  enabled: boolean;
  pollIntervalMinutes: number;
}

export class AccountMonitor extends BaseMonitor {
  name = 'AccountMonitor';

  private dataClient: DataApiClient;
  private accountRepo: TrackedAccountRepository;
  private tradeRepo: TradeRepository;
  private marketRepo: MarketRepository;
  private config: AccountMonitorConfig;
  private lastCheckTime: Date;

  constructor(config: AccountMonitorConfig) {
    super();
    this.config = config;
    this.enabled = config.enabled;
    this.dataClient = new DataApiClient();
    this.accountRepo = new TrackedAccountRepository();
    this.tradeRepo = new TradeRepository();
    this.marketRepo = new MarketRepository();
    this.lastCheckTime = new Date(Date.now() - 5 * 60 * 1000);
  }

  async run(): Promise<Alert[]> {
    if (!this.enabled) {
      this.log('Monitor disabled, skipping...');
      return [];
    }

    this.log('Starting tracked account monitoring...');

    try {
      const alerts: Alert[] = [];
      const trackedAccounts = await this.accountRepo.findAll();

      if (trackedAccounts.length === 0) {
        this.log('No tracked accounts configured');
        return [];
      }

      this.log(`Monitoring ${trackedAccounts.length} tracked accounts...`);

      for (const account of trackedAccounts) {
        try {
          const startTimestamp = Math.floor(this.lastCheckTime.getTime() / 1000);

          const activities = await this.dataClient.getUserActivity({
            user: account.address,
            type: 'TRADE',
            start: startTimestamp,
            limit: 100,
          });

          if (activities.length === 0) continue;

          this.log(
            `Found ${activities.length} new trades for ${account.name || account.address}`
          );

          for (const activity of activities) {
            if (!activity.market) continue;

            let market = await this.marketRepo.findByConditionId(activity.conditionId);

            if (!market) {
              market = await this.marketRepo.upsert({
                conditionId: activity.conditionId,
                slug: activity.market.slug,
                title: activity.market.title,
                volume24hr: 0,
              });
            }

            await this.tradeRepo.upsert({
              transactionHash: activity.transactionHash,
              userAddress: account.address,
              marketId: market.id,
              size: parseFloat(activity.size),
              usdcSize: parseTradeSize(activity),
              price: parseFloat(activity.price || '0'),
              side: activity.side || 'BUY',
              timestamp: new Date(activity.timestamp * 1000),
            });

            alerts.push({
              type: 'ACCOUNT_ACTIVITY',
              severity: this.calculateSeverity(parseTradeSize(activity)),
              title: `Tracked account activity: ${account.name || account.address}`,
              timestamp: new Date(),
              data: {
                account: {
                  address: account.address,
                  name: account.name,
                },
                trade: {
                  size: parseFloat(activity.size),
                  usdcSize: parseTradeSize(activity),
                  price: parseFloat(activity.price || '0'),
                  side: activity.side,
                  timestamp: new Date(activity.timestamp * 1000).toISOString(),
                  transactionHash: activity.transactionHash,
                },
                market: {
                  slug: activity.market.slug,
                  title: activity.market.title,
                  conditionId: activity.conditionId,
                  outcome: activity.market.outcome,
                },
              },
            });
          }
        } catch (error) {
          this.error(`Error monitoring account ${account.address}:`, error);
        }
      }

      this.lastCheckTime = new Date();

      this.log(`Account monitor completed. Found ${alerts.length} new activities.`);
      return alerts;
    } catch (error) {
      this.error('Error running account monitor:', error);
      return [];
    }
  }

  private calculateSeverity(usdcSize: number): 'low' | 'medium' | 'high' {
    if (usdcSize > 10000) return 'high';
    if (usdcSize > 1000) return 'medium';
    return 'low';
  }
}
