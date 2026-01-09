import { Monitor } from '../monitors/base/Monitor.js';
import { VolumeMonitor } from '../monitors/VolumeMonitor.js';
import { AccountMonitor } from '../monitors/AccountMonitor.js';
import { MarketMonitor } from '../monitors/MarketMonitor.js';
import { TradeMonitor } from '../monitors/TradeMonitor.js';
import { SmartMoneyMonitor } from '../monitors/SmartMoneyMonitor.js';
import { WebhookService } from './WebhookService.js';
import { AlertRepository } from '../db/repositories/AlertRepository.js';
import { Alert } from '../types/alerts.js';
import { Config } from '../config/schema.js';

export class MonitorOrchestrator {
  private monitors: Monitor[];
  private webhookService: WebhookService;
  private alertRepository: AlertRepository;
  private isRunning: boolean = false;

  constructor(config: Config) {
    this.monitors = [];
    this.alertRepository = new AlertRepository();
    this.webhookService = new WebhookService(
      config.webhook.url,
      config.webhook.retryAttempts,
      config.webhook.timeoutMs
    );

    this.initializeMonitors(config);
  }

  private initializeMonitors(config: Config): void {
    console.log('Initializing monitors...');

    const volumeMonitor = new VolumeMonitor({
      enabled: config.monitoring.volumeOutlier.enabled,
      stdDeviationThreshold: config.monitoring.volumeOutlier.stdDeviationThreshold,
      timeWindowHours: config.monitoring.volumeOutlier.timeWindowHours,
    });

    const accountMonitor = new AccountMonitor({
      enabled: config.monitoring.accountActivity.enabled,
      pollIntervalMinutes: config.monitoring.accountActivity.pollIntervalMinutes,
    });

    const marketMonitor = new MarketMonitor({
      enabled: config.monitoring.marketProbability.enabled,
      changeThresholdPercent: config.monitoring.marketProbability.changeThresholdPercent,
      trackLiveVolume: config.monitoring.marketProbability.trackLiveVolume,
    });

    const tradeMonitor = new TradeMonitor({
      enabled: config.monitoring.tradeActivity.enabled,
      largeTradeThreshold: config.monitoring.tradeActivity.largeTradeThreshold,
      whalePnlThreshold: config.monitoring.tradeActivity.whalePnlThreshold,
      includeTraderIntel: config.monitoring.tradeActivity.includeTraderIntel,
    });

    const smartMoneyMonitor = new SmartMoneyMonitor({
      enabled: config.monitoring.smartMoney.enabled,
      intervalMinutes: config.monitoring.smartMoney.intervalMinutes,
    });

    this.monitors = [volumeMonitor, accountMonitor, marketMonitor, tradeMonitor, smartMoneyMonitor];

    const enabledMonitors = this.monitors.filter((m) => m.enabled);
    console.log(
      `Initialized ${enabledMonitors.length}/${this.monitors.length} monitors:`,
      enabledMonitors.map((m) => m.name).join(', ')
    );
  }

  async runAllMonitors(): Promise<void> {
    if (this.isRunning) {
      console.log('Monitors already running, skipping this cycle...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('\n=== Starting monitoring cycle ===');
      const startTime = Date.now();

      const allAlerts: Alert[] = [];

      for (const monitor of this.monitors) {
        if (!monitor.enabled) continue;

        try {
          console.log(`\nRunning ${monitor.name}...`);
          const alerts = await monitor.run();

          if (alerts.length > 0) {
            console.log(`${monitor.name} generated ${alerts.length} alerts`);
            allAlerts.push(...alerts);
          }
        } catch (error) {
          console.error(`Error running ${monitor.name}:`, error);
        }
      }

      if (allAlerts.length > 0) {
        console.log(`\nTotal alerts generated: ${allAlerts.length}`);

        for (const alert of allAlerts) {
          try {
            const dbAlert = await this.alertRepository.create(alert);
            const success = await this.webhookService.sendAlert(alert);

            if (success) {
              await this.alertRepository.markAsSent(dbAlert.id);
            }
          } catch (error) {
            console.error('Error processing alert:', error);
          }
        }
      } else {
        console.log('\nNo alerts generated this cycle');
      }

      await this.webhookService.processPendingAlerts();

      const duration = Date.now() - startTime;
      console.log(`\n=== Monitoring cycle completed in ${duration}ms ===\n`);
    } catch (error) {
      console.error('Error in monitoring cycle:', error);
    } finally {
      this.isRunning = false;
    }
  }

  getMonitors(): Monitor[] {
    return this.monitors;
  }
}
