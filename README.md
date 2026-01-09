# Polymarket Monitoring Bot

A highly modular and extensible TypeScript bot that monitors Polymarket for notable trading activity and sends structured alerts to n8n via webhook.

## Features

### Core Monitoring
- **Smart Trade Alerts**: Monitor ALL trades ≥$10 with full trader intelligence
  - Lifetime P&L tracking (realized + unrealized)
  - Position size after trade
  - Trader pseudonyms and history
  - Whale trader detection ($100k+ trades)
- **Probability-Based Market Updates**: ONLY alerts on >1% probability shifts (no spam!)
- **Live Volume Tracking**: Real-time volume via `/live-volume` endpoint
- **Account Tracking**: Monitor specific wallet addresses for all trading activity
- **Volume Outlier Detection**: Statistical outlier detection (configurable std devs)

### Smart Money Analysis (Ready for Deployment)
- **Holder Distribution Analysis**: Track top 20 holders per side (Yes/No)
- **Concentration Metrics**: See what % top 5 holders control
- **Side P&L Comparison**: Cumulative P&L of Yes vs No holders
- **Open Interest Tracking**: Monitor market liquidity changes
- **Hour-over-Hour Analysis**: Detect smart money shifts

### Infrastructure
- **Webhook Alerts**: Structured JSON payloads with retry logic
- **PostgreSQL Storage**: Persists trades, snapshots, alerts, and smart money data
- **Modular Architecture**: Easy to add new monitoring strategies
- **5-Minute P&L Caching**: Efficient API usage with intelligent caching

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
    changeThresholdPercent: 1   # Alert on >1% probability shifts
    trackLiveVolume: true        # Use /live-volume endpoint

  tradeActivity:
    enabled: true
    largeTradeThreshold: 10      # Alert on trades >=$10
    whalePnlThreshold: 100000    # Track traders who make >=$100k trades
    includeTraderIntel: true     # Fetch trader P&L and position data
```

### Tracked Items (`config/tracked.yml`)

Add wallet addresses and market condition IDs you want to monitor.

**Important**: For live volume tracking, each market needs an `eventId`:

```yaml
markets:
  - conditionId: "0xd595eb9b81885ff018738300c79047e3ec89e87294424f57a29a7fa9162bf116"
    name: "Will Trump acquire Greenland before 2027?"
    eventId: 123456  # Required for live-volume tracking (get from market URL)
    enabled: true
```

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

- `LARGE_TRADE`: Trade ≥$10 detected (includes trader intelligence)
- `WHALE_ACTIVITY`: Trade from known whale (≥$100k lifetime)
- `PROBABILITY_SHIFT`: Probability change >1% on tracked market
- `VOLUME_OUTLIER`: Trade size is a statistical outlier
- `ACCOUNT_ACTIVITY`: Activity from a tracked account
- `SMART_MONEY_REPORT`: Hourly holder distribution and P&L analysis (coming soon)

### Trade Alert Example (with Trader Intelligence)

```json
{
  "timestamp": "2026-01-08T12:30:00Z",
  "alertType": "LARGE_TRADE",
  "severity": "medium",
  "title": "Trade on Will Trump acquire Greenland?",
  "data": {
    "market": {
      "slug": "trump-greenland-2027",
      "title": "Will Trump acquire Greenland before 2027?",
      "conditionId": "0xd595...",
      "outcomes": ["Yes", "No"]
    },
    "trade": {
      "size": 5000,
      "side": "BUY",
      "outcome": "Yes",
      "price": 0.34,
      "userAddress": "0x1234...",
      "timestamp": "2026-01-08T12:29:45Z"
    },
    "trader": {
      "address": "0x1234...",
      "name": "SmartTrader42",
      "lifetimePnL": 125000,      // Total P&L across all markets
      "realizedPnL": 98000,       // Closed positions
      "unrealizedPnL": 27000,     // Open positions
      "positionSize": 15000,      // Current position in THIS market
      "openPositions": 23,
      "closedPositions": 156
    },
    "currentProbability": 0.35,
    "isKnownWhale": false
  }
}
```

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
- **Data API** (`data-api.polymarket.com`):
  - User activity, trades, positions
  - `/positions` - Open positions with unrealized P&L
  - `/v1/closed-positions` - Historical positions with realized P&L
  - `/holders` - Top 20 holders per market side
  - `/oi` - Open interest by market
  - `/live-volume` - Real-time volume by event
- **CLOB API** (`clob.polymarket.com`): Real-time prices

No API key required for any endpoint.

### Trader Intelligence Calculation

Lifetime P&L is calculated by:
1. Fetching all open positions (`/positions`) → sum `realizedPnl` + `cashPnl`
2. Fetching closed positions (`/v1/closed-positions`) → sum `realizedPnl`
3. Caching for 5 minutes to optimize API calls

This gives you the complete picture of a trader's performance across all markets.

> **Pro Tip**: If you see a trader with >$100k lifetime P&L consistently betting one side, you might want to pay attention. Even Yale hedge fund bros respect the smart money on-chain. 🎩

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
