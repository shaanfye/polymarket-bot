# Deployment Guide

This bot is configured for automatic deployment to Railway with GitHub integration.

## Quick Start - Railway Deployment

### 1. Push to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit - Polymarket monitoring bot"

# Create a new GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/polymarket-bot.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Railway

1. Go to [Railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `polymarket-bot` repository
4. Railway will auto-detect Node.js and start deploying

### 3. Configure Environment Variables

In Railway dashboard, add these environment variables:

```
DATABASE_URL=postgres://postgres:yOkemf0r9rtJaXuI@db.zlibzzdumhotiyegpvdn.supabase.co:6543/postgres?pgbouncer=true
WEBHOOK_URL=https://sfye1.app.n8n.cloud/webhook/af5a6d10-ef39-4fab-8a1e-8d75b4f51590
NODE_ENV=production
```

### 4. Deploy!

Railway will automatically:
- Run `npm install`
- Run `npm run build` (which includes `prisma generate`)
- Run `npm run deploy` (which runs migrations and starts the bot)
- Auto-restart on crashes
- Auto-deploy on every git push to main

## Continuous Deployment

Every time you push to `main` branch, Railway will automatically:
1. Pull the latest code
2. Install dependencies
3. Build the project
4. Run database migrations
5. Restart the bot

## Local Development Workflow

```bash
# Make changes locally
npm run dev

# Test locally
npm run pm2:start
npm run pm2:logs

# When ready, commit and push
git add .
git commit -m "Your change description"
git push

# Railway will auto-deploy in ~1-2 minutes
```

## Monitoring on Railway

- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: CPU, memory, and network usage
- **Deployments**: See history of all deployments
- **Restarts**: Automatic restart on failure (max 10 retries)

## Alternative: Render.com

If you prefer Render:

1. Go to [Render.com](https://render.com)
2. New → Web Service → Connect GitHub repo
3. Build command: `npm run build`
4. Start command: `npm run deploy`
5. Add environment variables (same as above)
6. Deploy!

## Alternative: Fly.io

For Fly.io, you'll need a Dockerfile. Let me know if you want to use this option.

## Troubleshooting

**Bot not starting on Railway?**
- Check the logs in Railway dashboard
- Verify environment variables are set correctly
- Make sure DATABASE_URL has `?pgbouncer=true`

**Database migration errors?**
- Railway runs `prisma migrate deploy` automatically
- Check that all migrations are committed to git

**Webhook not working?**
- Test webhook locally first: `npm run dev`
- Check that WEBHOOK_URL is correct in Railway env vars
- Verify n8n webhook is set to POST method
