# Quick Start Guide

Get your cycling dashboard running in 10 minutes.

## Prerequisites

- Docker and Docker Compose installed
- Strava account
- 5-10 minutes

## Steps

### 1. Get Strava Credentials (2 minutes)

1. Visit https://www.strava.com/settings/api
2. Click "Create an App"
3. Fill in:
   - **Application Name**: "My Cycling Dashboard"
   - **Website**: http://localhost:3000
   - **Authorization Callback Domain**: `localhost`
4. Click "Create"
5. Copy your **Client ID** and **Client Secret**

### 2. Configure Environment (2 minutes)

```bash
# Clone or navigate to project
cd jamessampotter.co.uk

# Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Generate encryption key
docker run --rm python:3.11-slim sh -c "pip install cryptography && python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
```

Edit `backend/.env` and set:

```env
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
ENCRYPTION_KEY=your_generated_key
```

### 3. Start the Dashboard (3 minutes)

```bash
# Build and start all services
docker-compose up -d

# Wait for services to start (30 seconds)
sleep 30

# Check all services are running
docker-compose ps
```

### 4. Connect to Strava (2 minutes)

1. Open http://localhost:3000 in your browser
2. Click "Connect to Strava"
3. Authorize the application
4. Wait for initial sync (5-10 minutes for 365 days of activities)

### 5. Explore Your Dashboard (1 minute)

- **Dashboard**: http://localhost:3000 - Overview with KPIs and charts
- **Activities**: http://localhost:3000/activities - All your rides
- **Django Admin**: http://localhost:8000/admin - Database access

## What's Happening?

After you authorize:

1. **Initial Sync** (5-10 min): Fetches your last 365 days of activities
2. **Metrics Computation** (1-2 min): Calculates weekly stats, milestones
3. **Dashboard Ready**: View your cycling analytics

## Optional: Enable Real-time Updates

For automatic updates when you complete rides:

1. Install ngrok: https://ngrok.com/download
2. Expose backend: `ngrok http 8000`
3. Subscribe to webhooks:

```bash
docker-compose exec backend python manage.py strava_webhook_subscribe \
  --callback-url https://YOUR-NGROK-URL.ngrok.io/api/strava/webhook \
  --verify-token $(openssl rand -hex 32)
```

4. Add `STRAVA_WEBHOOK_VERIFY_TOKEN` to `backend/.env`
5. Restart: `docker-compose restart backend`

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Manually sync activities
docker-compose exec backend python manage.py strava_sync --days 7

# Stop everything
docker-compose down

# Start again
docker-compose up -d
```

## Troubleshooting

**"No athlete found" error**: Initial sync is still running. Wait a few minutes.

**Activities not showing**: Check Celery worker logs: `docker-compose logs celery_worker`

**Can't connect to Strava**: Verify Client ID and Secret are correct in `backend/.env`

## Next Steps

- Customize the dashboard UI in `frontend/src/app/page.tsx`
- Add more metrics in `backend/metrics/compute.py`
- Deploy to production (see README.md)

Enjoy your cycling dashboard!
