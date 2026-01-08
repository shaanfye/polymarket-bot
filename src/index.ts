import 'dotenv/config';
import cron from 'node-cron';
import { ConfigService } from './services/ConfigService.js';
import { MonitorOrchestrator } from './services/MonitorOrchestrator.js';
import { connectDatabase, disconnectDatabase } from './db/client.js';

const ASCII_LOGO = `
╔═══════════════════════════════════════════════╗
║   Polymarket Monitoring Bot                  ║
║   Advanced Market Surveillance System        ║
╚═══════════════════════════════════════════════╝
`;

class PolymarketBot {
  private configService: ConfigService;
  private orchestrator: MonitorOrchestrator | null = null;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.configService = new ConfigService();
  }

  async start(): Promise<void> {
    console.log(ASCII_LOGO);
    console.log('Starting Polymarket Monitoring Bot...\n');

    try {
      await connectDatabase();

      const config = this.configService.getConfig();
      const trackedConfig = this.configService.getTrackedConfig();

      console.log('Configuration loaded:');
      console.log(`- Polling interval: ${config.polling.intervalMinutes} minutes`);
      console.log(`- Webhook URL: ${config.webhook.url}`);
      console.log(`- Tracked accounts: ${trackedConfig.accounts.length}`);
      console.log(`- Tracked markets: ${trackedConfig.markets.length}\n`);

      this.orchestrator = new MonitorOrchestrator(config);

      const cronExpression = this.getCronExpression(config.polling.intervalMinutes);
      console.log(`Scheduling monitoring with cron: ${cronExpression}\n`);

      this.cronJob = cron.schedule(cronExpression, async () => {
        await this.orchestrator?.runAllMonitors();
      });

      console.log('Bot is running! Press Ctrl+C to stop.\n');

      console.log('Running initial monitoring cycle...');
      await this.orchestrator.runAllMonitors();
    } catch (error) {
      console.error('Failed to start bot:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  private getCronExpression(intervalMinutes: number): string {
    if (intervalMinutes >= 60) {
      const hours = Math.floor(intervalMinutes / 60);
      return `0 */${hours} * * *`;
    } else {
      return `*/${Math.floor(intervalMinutes)} * * * *`;
    }
  }

  async shutdown(): Promise<void> {
    console.log('\n\nShutting down bot...');

    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Stopped cron scheduler');
    }

    await disconnectDatabase();

    console.log('Bot shutdown complete');
    process.exit(0);
  }
}

const bot = new PolymarketBot();

process.on('SIGINT', async () => {
  await bot.shutdown();
});

process.on('SIGTERM', async () => {
  await bot.shutdown();
});

bot.start().catch(async (error) => {
  console.error('Fatal error:', error);
  await bot.shutdown();
});
