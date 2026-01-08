# 🚀 Deploy Your Bot Right Now

Everything is ready to deploy! Follow these steps:

---

## Step 1: Push to GitHub (5 minutes)

### A. Create GitHub Repository

1. Go to: https://github.com/new
2. Repository name: `polymarket-bot`
3. Set to **Private** ✅
4. **DO NOT** check "Initialize with README"
5. Click "Create repository"

### B. Push Your Code

Copy your GitHub username from the page, then run:

```bash
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/polymarket-bot.git
git push -u origin main
```

✅ Your code is now on GitHub!

---

## Step 2: Deploy to Railway (3 minutes)

### A. Sign Up & Connect

1. Go to: https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway to access your repositories

### B. Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Find and select `polymarket-bot`
4. Railway will start deploying automatically

### C. Add Environment Variables

Click on your project → "Variables" tab → "Add Variable"

Add these **exactly**:

```
DATABASE_URL
postgres://postgres:yOkemf0r9rtJaXuI@db.zlibzzdumhotiyegpvdn.supabase.co:6543/postgres?pgbouncer=true

WEBHOOK_URL
https://sfye1.app.n8n.cloud/webhook/af5a6d10-ef39-4fab-8a1e-8d75b4f51590

NODE_ENV
production
```

### D. Redeploy

After adding variables:
1. Click "Deployments" tab
2. Click "Deploy" or "Redeploy"

---

## Step 3: Verify It's Working

### Check Railway Logs

In Railway dashboard → "Logs" tab, you should see:

```
Starting monitors...
VolumeMonitor initialized
AccountMonitor initialized
MarketMonitor initialized
TradeMonitor initialized
All monitors started successfully
```

### Check n8n Webhook

Within 10 minutes, you should start seeing:
- Market updates every 10 minutes
- Large trades when they happen
- Probability shifts when odds move

---

## 🎉 You're Done!

### Your Bot is Now:

✅ Running 24/7 on Railway
✅ Auto-restarts on crashes
✅ Auto-deploys on every git push
✅ Sending alerts to your n8n webhook

### Making Changes

```bash
# Edit files locally
npm run dev  # test

# When ready
git add .
git commit -m "Your changes"
git push

# Railway auto-deploys in 1-2 minutes!
```

### Stop Local Bot (Optional)

Since it's running on Railway, you can stop the local one:

```bash
npm run pm2:stop
```

Or keep both running - they use the same database and webhook, so it's fine!

---

## Troubleshooting

### Build Fails?
- Check Railway logs for specific error
- Make sure environment variables are set correctly
- Verify all files are committed: `git status`

### No Alerts?
- Check Railway logs for errors
- Verify WEBHOOK_URL in Railway variables
- Check that markets are in `config/tracked.yml`

### Database Errors?
- Verify DATABASE_URL has `?pgbouncer=true`
- Check Supabase dashboard that database is active

### Need Help?
Check the logs:
- Railway: Dashboard → Logs
- Local: `npm run pm2:logs`

---

## What's Next?

### Add More Markets

Edit `config/tracked.yml`:

```yaml
markets:
  - conditionId: "0xd595eb9b81885ff018738300c79047e3ec89e87294424f57a29a7fa9162bf116"
    name: "Trump/Greenland"
    enabled: true
  - conditionId: "YOUR_NEW_MARKET_ID"
    name: "Your Market Name"
    enabled: true
```

Then:
```bash
git add config/tracked.yml
git commit -m "Add new market"
git push  # Railway auto-deploys!
```

### Add More Accounts to Track

Edit `config/tracked.yml`:

```yaml
accounts:
  - address: "0x1234..."
    name: "Whale Trader"
    enabled: true
```

Same process: commit and push!

### Adjust Alert Thresholds

Edit `config/default.yml` to change:
- Large trade threshold (currently $1,000)
- Whale PNL threshold (currently $100,000)
- Probability shift threshold (currently 5%)
- Update intervals

---

**Ready? Start with Step 1 above! 🚀**
