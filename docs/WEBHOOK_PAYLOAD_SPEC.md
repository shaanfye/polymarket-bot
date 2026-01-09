# Polymarket Bot Webhook Payload Specification

## Overview
This bot sends JSON webhook payloads for various market events on Polymarket. The payloads are structured but **dynamic** - new fields and alert types will be added over time. Design your handler to be **extensible and flexible**.

## Core Payload Structure

Every webhook payload follows this base structure:

```typescript
{
  "timestamp": string,        // ISO 8601 timestamp (e.g., "2026-01-08T12:30:00.000Z")
  "alertType": string,        // One of the alert types below (but MORE WILL BE ADDED)
  "severity": "low" | "medium" | "high",
  "title": string,            // Human-readable alert title
  "data": object              // Alert-specific data (structure varies by alertType)
}
```

## Alert Types (Current)

The `alertType` field can currently be one of:
- `LARGE_TRADE` - Trade ≥$10 detected
- `WHALE_ACTIVITY` - Trade from known whale (≥$100k lifetime P&L)
- `PROBABILITY_SHIFT` - Probability changed >1% on tracked market
- `VOLUME_OUTLIER` - Trade size is statistical outlier
- `ACCOUNT_ACTIVITY` - Activity from tracked wallet
- `MARKET_UPDATE` - General market update (rare, mostly deprecated)
- `SMART_MONEY_REPORT` - Hourly holder analysis (COMING SOON)

**⚠️ IMPORTANT**: New alert types WILL be added. Do NOT hardcode a fixed list. Handle unknown types gracefully.

## Data Payloads by Alert Type

### Common Fields (Appear in Most Alerts)

Most alerts include a `market` object:
```json
{
  "market": {
    "slug": string,           // URL-friendly market identifier
    "title": string,          // Full market question
    "conditionId": string,    // Unique market ID (0x...)
    "outcomes": string[]      // Usually ["Yes", "No"]
  }
}
```

### 1. LARGE_TRADE / WHALE_ACTIVITY

**Most Important Alert Type** - Fired for every trade ≥$10

```json
{
  "timestamp": "2026-01-08T12:30:00.000Z",
  "alertType": "LARGE_TRADE",  // or "WHALE_ACTIVITY"
  "severity": "low" | "medium" | "high",
  "title": "Trade on [Market Question]",
  "data": {
    "market": {
      "slug": "trump-greenland-2027",
      "title": "Will Trump acquire Greenland before 2027?",
      "conditionId": "0xd595eb9b...",
      "outcomes": ["Yes", "No"]
    },
    "trade": {
      "size": number,              // USDC amount (e.g., 5000 = $5,000)
      "side": "BUY" | "SELL",
      "outcome": string,           // Which outcome ("Yes" or "No")
      "price": number,             // Price paid (0.0 to 1.0)
      "userAddress": string,       // Wallet address (0x...)
      "transactionHash": string,   // TX hash (0x...)
      "timestamp": string          // When trade occurred (ISO 8601)
    },
    "trader": {
      "address": string,           // Same as trade.userAddress
      "name": string,              // Pseudonym or truncated address
      "lifetimePnL": number,       // Total P&L across ALL markets
      "realizedPnL": number,       // P&L from closed positions
      "unrealizedPnL": number,     // P&L from open positions
      "positionSize": number,      // Current position in THIS market
      "positionValue": number,     // Dollar value of position
      "openPositions": number,     // Count of open positions
      "closedPositions": number    // Count of closed positions
    },
    "currentProbability": number,  // Current market probability (0.0 to 1.0)
    "outcomePrices": number[],     // Prices for each outcome
    "isKnownWhale": boolean        // True if trader has ≥$100k lifetime P&L
  }
}
```

**Key Fields to Display**:
- `trader.name` + `trader.lifetimePnL` → "SmartTrader42 (P&L: $125,000)"
- `trade.size` + `trade.side` + `trade.outcome` → "$5,000 BUY on Yes"
- `trade.price` → "at $0.34"
- `currentProbability` → "Market now at 35%"
- `trader.positionSize` → "Total position: $15,000"

### 2. PROBABILITY_SHIFT

**Fired when probability changes >1%** (no more time-based spam)

```json
{
  "timestamp": "2026-01-08T12:30:00.000Z",
  "alertType": "PROBABILITY_SHIFT",
  "severity": "low" | "medium" | "high",
  "title": "Probability shift on [Market Question]",
  "data": {
    "market": { /* same as above */ },
    "probability": {
      "previous": number,          // Previous probability (0.0 to 1.0)
      "current": number,           // Current probability
      "change": number,            // Absolute change (e.g., 0.05 = 5%)
      "percentChange": number      // Percent change (e.g., 15.2 = 15.2% change)
    },
    "volume": {
      "current": number,           // Current 24h volume
      "change": number             // Volume change since last update
    }
  }
}
```

**Key Display**:
- `probability.previous` → `probability.current` (e.g., "28% → 35%")
- `probability.change` formatted as percentage
- `volume.change` → "Volume up $50,000"

### 3. VOLUME_OUTLIER

**Statistical outlier detection** (rare, high-impact trades)

```json
{
  "timestamp": "2026-01-08T12:30:00.000Z",
  "alertType": "VOLUME_OUTLIER",
  "severity": "high",
  "title": "Large trade detected on [Market]",
  "data": {
    "market": { /* same as above */ },
    "trade": {
      "size": number,
      "usdcSize": number,          // Same as size
      "price": number,
      "side": "BUY" | "SELL",
      "userAddress": string,
      "transactionHash": string,
      "timestamp": string
    },
    "statistics": {
      "mean": number,              // Average trade size
      "stdDev": number,            // Standard deviation
      "stdDeviations": number,     // How many σ above mean
      "threshold": number          // Configured threshold (e.g., 2)
    }
  }
}
```

### 4. ACCOUNT_ACTIVITY

**Activity from a tracked wallet**

```json
{
  "timestamp": "2026-01-08T12:30:00.000Z",
  "alertType": "ACCOUNT_ACTIVITY",
  "severity": "medium",
  "title": "Activity from [Account Name]",
  "data": {
    "account": {
      "address": string,
      "name": string
    },
    "trade": { /* same structure as LARGE_TRADE */ },
    "market": { /* same as above */ }
  }
}
```

### 5. SMART_MONEY_REPORT (Coming Soon)

**Hourly holder distribution and P&L analysis**

```json
{
  "timestamp": "2026-01-08T13:00:00.000Z",
  "alertType": "SMART_MONEY_REPORT",
  "severity": "low",
  "title": "Hourly Smart Money Report: [Market]",
  "data": {
    "market": { /* same as above */ },
    "openInterest": {
      "current": number,
      "change": number             // Hour-over-hour change
    },
    "volume": {
      "current": number,
      "change": number
    },
    "holderDistribution": {
      "yes": {
        "topHolders": [{           // Top 20 holders on Yes side
          "address": string,
          "name": string,
          "amount": number,        // Position size in THIS market
          "pnl": number,           // Total lifetime P&L (realized + unrealized)
          "realizedPnL": number,   // Locked in profits/losses from closed trades
          "unrealizedPnL": number  // Current P&L from open positions (at risk)
        }],
        "concentration": number,   // % held by top 5 (e.g., 68.5 = 68.5%)
        "totalAmount": number
      },
      "no": {
        "topHolders": [ /* same structure */ ],
        "concentration": number,
        "totalAmount": number
      }
    },
    "sidePnL": {
      "yes": {
        "totalPnL": number,        // Cumulative P&L of Yes holders
        "avgPnL": number           // Average P&L
      },
      "no": {
        "totalPnL": number,
        "avgPnL": number
      },
      "smarterSide": "YES" | "NO", // Which side has better traders
      "analysis": string           // Human-readable insight
    },
    "hourOverHour": {
      "openInterestTrend": "INCREASING" | "DECREASING",
      "volumeTrend": "INCREASING" | "DECREASING",
      "smartMoneyShift": string    // Description of P&L shifts
    }
  }
}
```

## Design Guidelines for Your Handler

### 1. **Be Flexible with alertType**
```javascript
// ❌ DON'T hardcode switch statements
switch (payload.alertType) {
  case 'LARGE_TRADE': ...
  case 'WHALE_ACTIVITY': ...
  // Breaks when new types are added
}

// ✅ DO use dynamic handlers or fallbacks
const handler = handlers[payload.alertType] || handlers.default;
handler(payload);
```

### 2. **Safely Access Nested Fields**
```javascript
// ❌ DON'T assume fields exist
const pnl = payload.data.trader.lifetimePnL; // Crashes if trader is undefined

// ✅ DO use optional chaining
const pnl = payload.data.trader?.lifetimePnL ?? 0;
```

### 3. **Format Numbers Intelligently**
- **Dollar amounts**: Format with commas and 2 decimals (`$5,000.00`)
- **Probabilities**: Show as percentages (`34.2%`)
- **Large P&L**: Use K/M suffixes (`$1.2M`, `$500K`)
- **Negative P&L**: Show in red/with warning emoji

### 4. **Handle Future Fields Gracefully**
New fields WILL be added to existing alert types. Don't fail if you see unknown fields - just ignore them or display generically.

### 5. **Severity Levels**
Use `severity` for visual styling:
- `low` → Blue/Info (most common)
- `medium` → Yellow/Warning (interesting)
- `high` → Red/Alert (urgent/large)

### 6. **Timestamps**
- `timestamp` is when the alert was generated
- `data.trade.timestamp` is when the actual trade occurred
- Always in ISO 8601 format, parse with `new Date()`

## Example Formatting Templates

### For LARGE_TRADE / WHALE_ACTIVITY:
```
🐋 [if isKnownWhale] [trader.name] (P&L: [format lifetimePnL])
💰 [format trade.size] [trade.side] on [trade.outcome] at [format trade.price]
📊 Market: [market.title] (now at [currentProbability]%)
📈 Position: [format trader.positionSize] in this market
```

### For PROBABILITY_SHIFT:
```
📊 [market.title]
📈 [previous]% → [current]% ([format change]% shift)
💵 Volume: [format volume.change] change
```

### For SMART_MONEY_REPORT:
```
🧠 Smart Money Report: [market.title]
💰 Open Interest: [format openInterest.current] ([trend])
🎯 Smart Side: [smarterSide] (avg P&L: [format avgPnL])
📊 Yes Concentration: [yesConcentration]% held by top 5
📊 No Concentration: [noConcentration]% held by top 5
```

## Testing Your Handler

Send test payloads with:
1. **Minimal data** (only required fields)
2. **Maximal data** (all optional fields present)
3. **Unknown alertType** (e.g., `"FUTURE_FEATURE"`)
4. **Missing nested fields** (e.g., `trader: null`)
5. **Extra unknown fields** (e.g., `newField: "test"`)

Your handler should not crash in any scenario.

## Updates & Versioning

This payload structure may evolve. Changes will be:
- **Additive** (new fields, new alert types)
- **Backward compatible** (existing fields won't be removed)
- **Documented** in git commits

Monitor the bot's GitHub repo for updates: https://github.com/shaanfye/polymarket-bot

## Questions?

If you encounter a payload structure not documented here, it's likely a new feature. Handle it gracefully and check the repo for updates.
