# Polymarket Monitoring Bot

A highly modular and extensible TypeScript bot that monitors Polymarket for notable trading activity and sends structured alerts to n8n via webhook.

## Features

- **Volume Outlier Detection**: Identifies trades that are statistical outliers (configurable standard deviations)
- **Account Tracking**: Monitors specific wallet addresses for all trading activity
- **Market Monitoring**: Tracks probability changes on specific markets
- **Webhook Alerts**: Sends structured JSON payloads to n8n with retry logic
- **PostgreSQL Storage**: Persists all trades, price snapshots, and alerts
- **Modular Architecture**: Easy to add new monitoring strategies

## Architecture

```
src/
├── monitors/          # Pluggable monitoring modules
│   ├── VolumeMonitor.ts
│   ├── AccountMonitor.ts
│   └── MarketMonitor.ts
├── api/               # Polymarket API clients
├── services/          # Core business logic
├── db/                # Database layer with Prisma
└── config/            # Configuration schemas
```

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- n8n webhook URL

### 2. Installation

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d

# Copy environment variables
cp .env.example .env
```

### 3. Configuration

Edit `.env`:

```env
DATABASE_URL="postgresql://polymarket:polymarket_dev_password@localhost:5432/polymarket_bot"
WEBHOOK_URL="https://your-n8n-instance.com/webhook/polymarket"
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 5. Configure Tracking

Edit `config/tracked.yml` to add accounts and markets you want to monitor:

```yaml
accounts:
  - address: "0x1234567890abcdef1234567890abcdef12345678"
    name: "Whale Trader"
    enabled: true

markets:
  - conditionId: "0xabcdef..."
    name: "Presidential Election 2024"
    enabled: true
```

### 6. Run the Bot

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

## Configuration

### Main Config (`config/default.yml`)

```yaml
polling:
  intervalMinutes: 1.5  # How often to run monitors

webhook:
  url: "${WEBHOOK_URL}"
  retryAttempts: 3
  timeoutMs: 5000

monitoring:
  volumeOutlier:
    enabled: true
    stdDeviationThreshold: 2    # How many std devs = outlier
    timeWindowHours: 24         # Historical window for stats

  accountActivity:
    enabled: true
    pollIntervalMinutes: 1.5

  marketProbability:
    enabled: true
    changeThresholdPercent: 5   # Alert on 5%+ probability change
    updateIntervalMinutes: 10   # Regular update interval
```

### Tracked Items (`config/tracked.yml`)

Add wallet addresses and market condition IDs you want to monitor.

## Webhook Payload Format

All alerts are sent as structured JSON:

```json
{
  "timestamp": "2026-01-06T21:30:00Z",
  "alertType": "VOLUME_OUTLIER",
  "severity": "high",
  "title": "Large trade detected on market",
  "data": {
    "market": {
      "slug": "will-biden-win-2024",
      "title": "Will Biden win 2024?",
      "conditionId": "0x..."
    },
    "trade": {
      "size": 50000,
      "usdcSize": 50000,
      "price": 0.52,
      "side": "BUY",
      "userAddress": "0x...",
      "transactionHash": "0x...",
      "timestamp": "2026-01-06T21:29:45Z"
    },
    "statistics": {
      "mean": 1200,
      "stdDev": 15000,
      "stdDeviations": 3.2,
      "threshold": 2
    }
  }
}
```

## Alert Types

- `VOLUME_OUTLIER`: Trade size is a statistical outlier
- `ACCOUNT_ACTIVITY`: Activity from a tracked account
- `PROBABILITY_SHIFT`: Significant probability change on tracked market
- `MARKET_UPDATE`: Regular update on tracked market

## Extensibility

### Adding a New Monitor

1. Create a new file in `src/monitors/`:

```typescript
import { BaseMonitor } from './base/Monitor.js';
import { Alert } from '../types/alerts.js';

export class MyCustomMonitor extends BaseMonitor {
  name = 'MyCustomMonitor';

  async run(): Promise<Alert[]> {
    // Your monitoring logic here
    return [];
  }
}
```

2. Add config to `src/config/schema.ts`
3. Register in `MonitorOrchestrator.ts`

### Adding a New Alert Type

1. Add to `src/types/alerts.ts`:

```typescript
export type AlertType =
  | 'VOLUME_OUTLIER'
  | 'MY_NEW_ALERT'  // Add here
  | ...
```

2. Create a monitor that generates this alert type

## Database Management

```bash
# Open Prisma Studio to view data
npm run db:studio

# Create a new migration
npm run db:migrate

# Push schema changes without migration
npm run db:push
```

## API Reference

### Polymarket APIs Used

- **Gamma API** (`gamma-api.polymarket.com`): Markets, events, volume
- **Data API** (`data-api.polymarket.com`): User activity, trades
- **CLOB API** (`clob.polymarket.com`): Real-time prices

No API key required for any endpoint.

## Troubleshooting

### Database Connection Errors

Ensure PostgreSQL is running:

```bash
docker-compose ps
```

### Webhook Failures

Check the `alerts` table for failed webhooks:

```bash
npm run db:studio
```

Failed alerts are automatically retried up to 3 times with exponential backoff.

### No Alerts Being Generated

1. Check that monitors are enabled in `config/default.yml`
2. Verify tracked accounts/markets exist in `config/tracked.yml`
3. Ensure there's actual trading activity on Polymarket
4. Check logs for errors

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Type check
npx tsc --noEmit
```

## Production Deployment

1. Set up PostgreSQL (managed service recommended)
2. Set environment variables
3. Run migrations: `npm run db:migrate`
4. Build: `npm run build`
5. Start with process manager: `pm2 start dist/index.js --name polymarket-bot`

## License

MIT

## Resources

- [Polymarket Documentation](https://docs.polymarket.com/)
- [Gamma API Reference](https://docs.polymarket.com/developers/gamma-markets-api/overview)
- [Data API Reference](https://docs.polymarket.com/developers/misc-endpoints/data-api-activity)
