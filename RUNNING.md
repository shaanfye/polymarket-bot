# Running the Polymarket Bot 24/7

## ✅ Bot is Currently Running

Status: **ONLINE** (managed by PM2)

## 📋 Common Commands

### Check Status
```bash
npm run pm2:status
```

### View Live Logs
```bash
npm run pm2:logs
```
Press `Ctrl+C` to exit logs (bot keeps running)

### Stop the Bot
```bash
npm run pm2:stop
```

### Start the Bot
```bash
npm run pm2:start
```

### Restart the Bot
```bash
npm run pm2:restart
```

### Remove from PM2
```bash
npm run pm2:delete
```

## 🚀 Auto-Start on System Reboot

To make the bot start automatically when your computer/server restarts:

```bash
# Generate startup script
npx pm2 startup

# Copy and run the command it shows you (will require sudo)

# Save current PM2 process list
npx pm2 save
```

Now the bot will automatically start when your system reboots!

## 📊 What's Running

- **Process Name:** polymarket-bot
- **Monitors:** 4 active
  - VolumeMonitor (statistical outliers)
  - AccountMonitor (tracked accounts)
  - MarketMonitor (probability shifts)
  - TradeMonitor (large trades & whales)
- **Polling:** Every 1-2 minutes
- **Auto-restart:** Yes (on crashes)
- **Memory limit:** 500MB

## 📝 Log Files

Logs are stored in:
- `./logs/output.log` - Standard output
- `./logs/error.log` - Errors only

## 🔧 Troubleshooting

**Bot not starting?**
```bash
# Check PM2 status
npm run pm2:status

# View errors
npm run pm2:logs
```

**Bot crashed?**
PM2 will automatically restart it. Check logs to see why.

**Want to see what's happening?**
```bash
npm run pm2:logs
```

## 🎯 Current Alerts

You're receiving alerts for:
1. **MARKET_UPDATE** - Every 10 minutes
2. **PROBABILITY_SHIFT** - When odds move >5%
3. **LARGE_TRADE** - Trades over $1,000
4. **WHALE_ACTIVITY** - When traders who've made $100k+ trades make ANY trade

All sent to: `https://sfye1.app.n8n.cloud/webhook/...`

## 📱 Adding More Markets

Edit `config/tracked.yml` and restart:
```bash
npm run pm2:restart
```
