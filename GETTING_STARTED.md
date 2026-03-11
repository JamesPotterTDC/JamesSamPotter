# Getting Started with Your Cycling Dashboard

Complete guide from zero to dashboard in under 15 minutes.

## Overview

You're about to set up a personal cycling analytics dashboard that:
- Syncs all your Strava rides automatically
- Shows beautiful charts and maps
- Tracks milestones and progress
- Updates within 1 hour of each ride

## Before You Begin

**You'll need:**
- A computer with Docker installed
- A Strava account with cycling activities
- 15 minutes
- Basic command line familiarity

**Don't have Docker?** Install from https://docs.docker.com/get-docker/

## Step-by-Step Setup

### Step 1: Get Your Strava API Credentials (5 min)

1. **Go to Strava API settings**
   
   Visit: https://www.strava.com/settings/api

2. **Create a new application**
   
   Click "Create an App" and fill in:
   
   - **Application Name**: "My Cycling Dashboard" (or any name)
   - **Category**: Choose any (e.g., "Data Importer")
   - **Club**: Leave blank
   - **Website**: `http://localhost:3000`
   - **Application Description**: "Personal cycling analytics dashboard"
   - **Authorization Callback Domain**: `localhost` (important: no http://, no port)
   - **Upload Icon**: Optional

3. **Save and note your credentials**
   
   After creating, you'll see:
   - **Client ID**: A number like `123456`
   - **Client Secret**: A long string like `abc123def456...`
   
   Keep these safe - you'll need them in Step 3.

### Step 2: Download and Prepare the Project (2 min)

```bash
# Navigate to the project directory
cd jamessampotter.co.uk

# Verify all files are present
./verify.sh
```

You should see all green checkmarks.

### Step 3: Configure Environment (3 min)

1. **Generate an encryption key**

   ```bash
   docker run --rm python:3.11-slim sh -c "pip install -q cryptography && python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
   ```

   This will output something like: `abcXYZ123_encrypted_key_here==`
   
   Copy this key.

2. **Create backend environment file**

   ```bash
   cp backend/.env.example backend/.env
   ```

   Open `backend/.env` and set these three values:

   ```env
   STRAVA_CLIENT_ID=123456  # Your Client ID from Step 1
   STRAVA_CLIENT_SECRET=abc123def456...  # Your Client Secret from Step 1
   ENCRYPTION_KEY=abcXYZ123_encrypted_key_here==  # Your key from above
   ```

   You can leave all other values as-is for local development.

3. **Create frontend environment file**

   ```bash
   cp frontend/.env.example frontend/.env
   ```

   The defaults work fine for local development.

### Step 4: Start the Application (3 min)

```bash
# Build and start all services (this takes 2-3 minutes first time)
docker-compose up -d

# Wait for services to start
sleep 30

# Check everything is running
docker-compose ps
```

You should see 6 services running:
- `db` (Postgres)
- `redis` (Redis)
- `backend` (Django)
- `celery_worker` (Background jobs)
- `celery_beat` (Scheduler)
- `frontend` (Next.js)

**Troubleshooting**: If any service isn't running, check logs:

```bash
docker-compose logs [service-name]
```

### Step 5: Connect to Strava (2 min)

1. **Open your browser**
   
   Visit: http://localhost:3000

2. **Click "Connect to Strava"**
   
   You'll be redirected to Strava's authorization page.

3. **Authorize the app**
   
   Click "Authorize" to give your dashboard access to your activities.

4. **Wait for redirect**
   
   You'll be redirected back to your dashboard. It will show "Connecting to Strava..." briefly.

5. **Initial sync starts**
   
   In the background, your dashboard is now fetching your last 365 days of activities. This takes 5-10 minutes depending on how many rides you have.

### Step 6: Watch the Sync (Optional)

Want to see the sync in action?

```bash
# Watch the Celery worker logs
docker-compose logs -f celery_worker
```

You'll see messages like:
```
INFO Fetching page 1 for athlete 12345
INFO Created activity 999888777: Morning Ride
INFO Sync complete: 487 activities fetched, 487 new
```

Press `Ctrl+C` to stop watching logs.

### Step 7: Explore Your Dashboard

After 5-10 minutes, refresh http://localhost:3000

You'll see:

**Dashboard (Home)**
- 📊 Year-to-date stats (distance, time, elevation, energy)
- 📅 This week summary
- 🏠 Indoor vs outdoor split
- 📈 12-week trend chart
- 🏆 Milestones (Everest progress, streak, longest ride)
- 🚴 Recent activities

**Activities Page**
- Full list of all rides
- Filter by indoor/outdoor
- Paginated view
- Click any ride for details

**Activity Detail**
- Route map (for outdoor rides)
- All statistics
- Power, heart rate, cadence data
- Link to view on Strava

## Common Commands

```bash
# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# Stop everything
docker-compose down

# Start again
docker-compose up -d

# Manually sync activities
docker-compose exec backend python manage.py strava_sync --days 7

# Access database
docker-compose exec db psql -U postgres -d cycling_dashboard

# Django shell
docker-compose exec backend python manage.py shell

# Recompute metrics
docker-compose exec backend python manage.py compute_metrics
```

## Enable Real-time Updates (Optional)

Want your dashboard to update automatically when you finish a ride?

### Quick Version (Local Development)

1. **Install ngrok**: https://ngrok.com/download
2. **Expose your backend**:
   ```bash
   ngrok http 8000
   ```
3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)
4. **Generate a verify token**:
   ```bash
   openssl rand -hex 32
   ```
5. **Add to backend/.env**:
   ```env
   STRAVA_WEBHOOK_VERIFY_TOKEN=your_token_from_step_4
   ```
6. **Restart backend**:
   ```bash
   docker-compose restart backend
   ```
7. **Subscribe to webhooks**:
   ```bash
   docker-compose exec backend python manage.py strava_webhook_subscribe \
     --callback-url https://abc123.ngrok.io/api/strava/webhook \
     --verify-token your_token_from_step_4
   ```

**Success**: You'll see `Subscription created` with an ID.

Now when you complete a ride on Strava, it'll appear in your dashboard within 1 hour automatically!

## What's Next?

### Explore the Dashboard

- View your cycling stats and trends
- Click through activities and view maps
- Track your Everest progress
- See your longest ride

### Customize

- Modify the UI in `frontend/src/app/page.tsx`
- Add new metrics in `backend/metrics/compute.py`
- Change colors in `frontend/tailwind.config.ts`

### Deploy to Production

When ready, see **DEPLOYMENT.md** for:
- Railway deployment (easiest)
- Vercel frontend hosting
- DigitalOcean deployment
- Self-hosted options

### Add More Features

- Stream visualizations (HR zones, power curves)
- Dark mode
- Activity comparison
- Export to CSV
- Email notifications

See **CONTRIBUTING.md** for development setup.

## Troubleshooting

### "No athlete found" on dashboard

**Cause**: Initial sync is still running.

**Solution**: Wait 5-10 minutes, then refresh. Check sync progress:

```bash
docker-compose logs celery_worker | grep "Sync complete"
```

### "Failed to fetch summary"

**Cause**: Backend isn't ready yet.

**Solution**: 

```bash
# Check backend is running
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Try accessing API directly
curl http://localhost:8000/api/health/
```

### Can't connect to Strava

**Cause**: Incorrect credentials or callback domain.

**Solution**:
1. Verify `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` in `backend/.env`
2. Ensure callback domain in Strava settings is `localhost` (no protocol)
3. Restart backend: `docker-compose restart backend`

### Docker issues

```bash
# Reset everything
docker-compose down -v
docker-compose up -d --build

# Check Docker is running
docker info

# Free up space
docker system prune
```

### Still stuck?

1. Check **TESTING.md** for detailed testing steps
2. Review **README.md** for comprehensive documentation
3. Look at logs: `docker-compose logs -f`

## FAQ

**Q: How often does it sync?**

A: Every hour automatically (fallback). With webhooks, updates happen within 5-10 minutes of completing a ride.

**Q: Can I sync older activities?**

A: Yes, run:
```bash
docker-compose exec backend python manage.py strava_sync --days 1095  # 3 years
```

**Q: Does it use my Strava API rate limit?**

A: Yes. The dashboard tracks limits and stays within them (100 req/15min, 1000/day).

**Q: Can I host this for friends?**

A: Yes, but you'll need to add authentication. See ARCHITECTURE.md for scaling guidance.

**Q: Does it store my password?**

A: No. OAuth tokens are stored encrypted. Your Strava password never touches this app.

**Q: What about privacy?**

A: All data stays in your database. Nothing is sent to third parties. It's your data.

**Q: Can I customize the dashboard?**

A: Absolutely! All code is yours to modify. See CONTRIBUTING.md for development setup.

**Q: Cost to run in production?**

A: Railway free tier works for personal use. Paid tiers start at ~$5-10/month.

## Success Checklist

After setup, you should be able to:

- [ ] Access http://localhost:3000 and see dashboard
- [ ] See your YTD statistics
- [ ] View recent activities
- [ ] Click an activity and see the map
- [ ] Filter activities by indoor/outdoor
- [ ] See milestone progress (Everest challenge)
- [ ] Access Django admin at http://localhost:8000/admin

If all checked, you're good to go!

## Next Steps

1. **Use it**: Check your dashboard after rides
2. **Customize**: Tweak the UI to your liking
3. **Share**: Deploy to production and access from anywhere
4. **Extend**: Add features you want (see PROJECT.md for ideas)

Enjoy your cycling dashboard! 🚴
