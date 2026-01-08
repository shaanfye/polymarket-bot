# GitHub Setup & Deployment

Quick guide to push this bot to GitHub and deploy to Railway.

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `polymarket-bot` (or whatever you prefer)
3. Set to **Private** (recommended since it contains trading logic)
4. Don't initialize with README (we already have one)
5. Click "Create repository"

## Step 2: Push to GitHub

GitHub will show you commands - use these:

```bash
# In your polymarket directory
git remote add origin https://github.com/YOUR_USERNAME/polymarket-bot.git
git push -u origin main
```

**Replace `YOUR_USERNAME` with your GitHub username!**

## Step 3: Deploy to Railway

### Option A: Railway (Recommended - Easiest)

1. Go to https://railway.app
2. Sign up with your GitHub account
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `polymarket-bot` repository
6. Railway will detect the Node.js project automatically

### Add Environment Variables

In the Railway dashboard, go to Variables and add:

```
DATABASE_URL=postgres://postgres:yOkemf0r9rtJaXuI@db.zlibzzdumhotiyegpvdn.supabase.co:6543/postgres?pgbouncer=true
WEBHOOK_URL=https://sfye1.app.n8n.cloud/webhook/af5a6d10-ef39-4fab-8a1e-8d75b4f51590
NODE_ENV=production
```

### Deploy

Click "Deploy" - Railway will:
- Install dependencies
- Run database migrations
- Build the TypeScript
- Start the bot
- Auto-restart on crashes
- **Auto-deploy on every git push!**

### View Logs

In Railway dashboard, click on your service → "Logs" to see live output

## Step 4: Make Changes & Auto-Deploy

From now on, your workflow is:

```bash
# Make changes locally
npm run dev  # test locally

# When ready, commit and push
git add .
git commit -m "Description of changes"
git push

# Railway automatically deploys in ~1-2 minutes!
```

## Monitoring

### Railway Dashboard
- **Logs**: Real-time logs from your bot
- **Metrics**: CPU, memory, network usage
- **Deployments**: History of all deployments
- **Variables**: Manage environment variables

### Check if Bot is Running

In Railway logs, you should see:
```
Starting monitors...
VolumeMonitor initialized
AccountMonitor initialized
MarketMonitor initialized
TradeMonitor initialized
All monitors started successfully
```

### Test Webhook

In Railway logs, when an alert is sent:
```
Sending webhook alert: MARKET_UPDATE
Webhook sent successfully: 200
```

## Troubleshooting

**Build fails on Railway?**
- Check the build logs for errors
- Make sure all dependencies are in package.json
- Verify NODE_ENV is set to "production"

**Database connection errors?**
- Verify DATABASE_URL is correct
- Make sure it includes `?pgbouncer=true`
- Check Supabase database is still active

**No alerts being sent?**
- Check Railway logs for errors
- Verify WEBHOOK_URL is correct
- Test locally first: `npm run dev`
- Make sure markets are in config/tracked.yml

**Want to add more markets?**

Edit `config/tracked.yml`, commit, and push:
```bash
# Edit config/tracked.yml
git add config/tracked.yml
git commit -m "Add more markets to track"
git push
# Railway auto-deploys!
```

## Cost

Railway free tier includes:
- $5 credit/month
- Should be enough for this bot
- ~$0.01/hour for a small Node.js app
- ~$7.20/month if you exceed free tier

Monitor usage in Railway dashboard.

## Next Steps

1. Push to GitHub (see Step 2 above)
2. Deploy to Railway (see Step 3 above)
3. Monitor logs to ensure it's working
4. Enjoy automated deployments on every push!
