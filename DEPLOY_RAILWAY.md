# Railway Deployment Guide

## Prerequisites

- GitHub repo pushed (see root README.md for git commands)
- Railway account: https://railway.app
- Railway CLI (optional): `npm install -g @railway/cli`

## Overview

Railway deployment uses:
- **1 Postgres plugin** (DATABASE_URL auto-provided)
- **1 Redis plugin** (REDIS_URL auto-provided)
- **3-4 services from same repo**:
  - `backend-web` - Django API (gunicorn)
  - `backend-worker` - Celery worker
  - `backend-beat` - Celery beat scheduler (optional but recommended)
  - `frontend` - Next.js (optional, can use Vercel instead)

---

## Step 1: Create Railway Project

1. Go to https://railway.app/new
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `JamesSamPotter` repository
5. Railway will detect the monorepo

---

## Step 2: Add Database Plugins

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway automatically provides `DATABASE_URL` to all services
4. Click "New" again
5. Select "Database" → "Add Redis"
6. Railway automatically provides `REDIS_URL` to all services

---

## Step 3: Create Backend Web Service

1. Click "New" → "GitHub Repo" → select `JamesSamPotter`
2. Configure service:
   - **Service Name**: `backend-web`
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty, uses default)
   - **Start Command**: 
     ```
     python manage.py migrate && python manage.py collectstatic --noinput && gunicorn cycling_dashboard.wsgi:application --bind 0.0.0.0:$PORT --workers 4
     ```
   - **Watch Paths**: `backend/**`

3. Add environment variables (see "Environment Variables" section below)

4. Generate domain:
   - Go to service Settings → Networking
   - Click "Generate Domain"
   - Copy the URL (e.g., `backend-web-production.up.railway.app`)

---

## Step 4: Create Celery Worker Service

1. Click "New" → "GitHub Repo" → select `JamesSamPotter`
2. Configure service:
   - **Service Name**: `backend-worker`
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty)
   - **Start Command**:
     ```
     celery -A cycling_dashboard worker --loglevel=info --concurrency=2
     ```
   - **Watch Paths**: `backend/**`

3. Add same environment variables as backend-web (Railway can share variables)

---

## Step 5: Create Celery Beat Service (Recommended)

1. Click "New" → "GitHub Repo" → select `JamesSamPotter`
2. Configure service:
   - **Service Name**: `backend-beat`
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty)
   - **Start Command**:
     ```
     celery -A cycling_dashboard beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
     ```
   - **Watch Paths**: `backend/**`

3. Add same environment variables

---

## Step 6: Create Frontend Service (Optional)

**Option A: Deploy on Vercel (Recommended)**
- Easier for Next.js
- Better performance
- See "Frontend on Vercel" section below

**Option B: Deploy on Railway**

1. Click "New" → "GitHub Repo" → select `JamesSamPotter`
2. Configure service:
   - **Service Name**: `frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Watch Paths**: `frontend/**`

3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-web.railway.app/api
   ```

4. Generate domain for frontend

---

## Environment Variables

### Backend Services (web, worker, beat)

**Required**:
```bash
# Django (generate with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
DJANGO_SECRET_KEY=your-50-char-random-secret

# Deployment
DEBUG=False
ALLOWED_HOSTS=your-backend.railway.app
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.vercel.app

# Strava API (from https://www.strava.com/settings/api)
STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=abc123def456...

# Encryption (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
ENCRYPTION_KEY=your-fernet-key

# Frontend URL
FRONTEND_URL=https://your-frontend.vercel.app

# Admin
ADMIN_API_TOKEN=generate-random-token

# Privacy (optional, defaults shown)
MAP_REDACT_PERCENT=10
STRAVA_FETCH_STREAMS=False
```

**Auto-provided by Railway**:
- `DATABASE_URL` (from Postgres plugin)
- `REDIS_URL` (from Redis plugin)
- `PORT` (Railway assigns dynamically)

**Not needed in Railway**:
- `POSTGRES_*` (use DATABASE_URL)
- `CELERY_BROKER_URL` (use REDIS_URL)
- `CELERY_RESULT_BACKEND` (use REDIS_URL)

### Frontend Service (if on Railway)

```bash
NEXT_PUBLIC_API_URL=https://your-backend-web.railway.app/api
```

---

## Step 7: Configure Strava Application

1. Go to https://www.strava.com/settings/api
2. Update your Strava application:
   - **Authorization Callback Domain**: 
     - If frontend on Vercel: `your-app.vercel.app`
     - If frontend on Railway: `your-frontend.railway.app`
   - **Website**: `https://your-frontend-url`

---

## Step 8: Subscribe to Strava Webhooks

Once backend is deployed:

```bash
# Using Railway CLI
railway run -s backend-web python manage.py strava_webhook_subscribe \
  --callback-url https://your-backend.railway.app/api/strava/webhook \
  --verify-token $(openssl rand -hex 32)

# OR via local with DATABASE_URL
export DATABASE_URL=<from_railway>
export REDIS_URL=<from_railway>
python backend/manage.py strava_webhook_subscribe \
  --callback-url https://your-backend.railway.app/api/strava/webhook \
  --verify-token <same_as_env_var>
```

Add `STRAVA_WEBHOOK_VERIFY_TOKEN` to Railway environment variables.

---

## Post-Deploy Checklist

```bash
# 1. Check backend health
curl https://your-backend.railway.app/api/health/

# Expected: {"status":"healthy","checks":{"database":"ok","redis":"ok"}}

# 2. Check API summary (before connecting Strava)
curl https://your-backend.railway.app/api/summary/

# Expected: 404 (no athlete yet) or 200 with data

# 3. Visit frontend
open https://your-frontend.vercel.app

# 4. Connect to Strava
# Click "Connect to Strava", authorize, wait for sync

# 5. Check Celery worker logs in Railway
# Should see: "Starting backfill for athlete..."

# 6. Verify privacy
curl https://your-backend.railway.app/api/activities/ | grep "start_latlng"

# Expected: No output (field not present)
```

---

## Frontend on Vercel (Recommended)

### Deploy Frontend to Vercel

1. Go to https://vercel.com/new
2. Import `JamesSamPotter` repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm ci`

4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
   ```

5. Deploy

6. Copy Vercel domain and update:
   - Railway `FRONTEND_URL` env var
   - Railway `CORS_ALLOWED_ORIGINS` env var
   - Railway `CSRF_TRUSTED_ORIGINS` env var
   - Strava Authorization Callback Domain

---

## Service Commands Reference

### Backend Web
```bash
# Build: (automatic - pip install -r requirements.txt)
# Start:
python manage.py migrate && python manage.py collectstatic --noinput && gunicorn cycling_dashboard.wsgi:application --bind 0.0.0.0:$PORT --workers 4
```

### Backend Worker
```bash
# Build: (automatic - pip install -r requirements.txt)
# Start:
celery -A cycling_dashboard worker --loglevel=info --concurrency=2
```

### Backend Beat
```bash
# Build: (automatic - pip install -r requirements.txt)
# Start:
celery -A cycling_dashboard beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Frontend (if on Railway)
```bash
# Build:
npm ci && npm run build
# Start:
npm start
```

---

## Troubleshooting

### Migrations not running

```bash
# Connect to Railway service shell
railway run -s backend-web python manage.py migrate

# Or via Railway CLI with service attached
railway shell
python manage.py migrate
```

### Static files not found

- Ensure `collectstatic` runs in start command (it does in command above)
- WhiteNoise handles static files automatically
- Check logs: `railway logs -s backend-web`

### Celery not connecting

- Verify `REDIS_URL` is set in worker/beat services
- Check Redis plugin is added to project
- View logs: `railway logs -s backend-worker`

### CORS errors

- Add frontend domain to `CORS_ALLOWED_ORIGINS`
- Add frontend domain to `CSRF_TRUSTED_ORIGINS`
- Restart backend service

### Webhook not working

1. Verify webhook subscription ID in Strava settings
2. Check webhook endpoint: `curl https://your-backend.railway.app/api/strava/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test`
3. Check logs for incoming webhook events

---

## Environment Variable Generation

```bash
# Django secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Admin token
openssl rand -hex 32

# Webhook verify token
openssl rand -hex 32
```

---

## Scaling on Railway

### Increase Resources

- Go to service Settings → Resources
- Adjust memory/CPU as needed
- Default (512MB, 0.5 vCPU) is fine for MVP

### Horizontal Scaling

- Worker service can scale to multiple instances
- Beat service should only have 1 instance (scheduler)
- Web service can scale if needed

### Database Scaling

- Upgrade Postgres plan in Railway
- Connection pooling via `conn_max_age=600` already configured

---

## Cost Estimate

**Railway free tier**: $5 credit/month
- Small personal use: Usually free
- Moderate use: $5-15/month

**With Vercel frontend**: Free tier sufficient for personal use

**Typical breakdown**:
- Postgres: $5/month (Hobby plan)
- Redis: $3/month
- Backend web: $2-5/month
- Workers: $2-5/month
- Frontend on Vercel: Free

**Total**: ~$10-15/month for full deployment

---

## Monitoring

### Railway Dashboard

- View logs for each service
- Monitor resource usage
- Set up notifications for crashes

### Health Checks

```bash
# Add to UptimeRobot or similar
https://your-backend.railway.app/api/health/
```

### Sentry (Optional)

Add to requirements:
```bash
pip install sentry-sdk
```

Configure in settings.py:
```python
import sentry_sdk
sentry_sdk.init(dsn=os.getenv('SENTRY_DSN'))
```

---

## Backup Strategy

### Database Backups

Railway Postgres includes automatic backups on paid plans.

Manual backup:
```bash
# Export
railway connect Postgres
pg_dump > backup.sql

# Restore
railway connect Postgres
psql < backup.sql
```

### Code Backups

GitHub repository is your source of truth.

---

## Rollback

```bash
# Rollback to previous deployment
railway rollback -s backend-web

# Or redeploy from specific commit
railway up --service backend-web
```

---

## Alternative: Deploy Frontend on Railway

If you prefer all services in one place:

1. Create frontend service as shown in Step 6
2. Set `NEXT_PUBLIC_API_URL` to backend URL
3. Generate domain for frontend
4. Update backend CORS/CSRF settings with frontend URL

---

## Summary

**Required Railway services**: 2 plugins + 3 services
- ✅ PostgreSQL plugin (auto-provides DATABASE_URL)
- ✅ Redis plugin (auto-provides REDIS_URL)
- ✅ backend-web service (Django API)
- ✅ backend-worker service (Celery worker)
- ✅ backend-beat service (Celery scheduler)

**Optional**:
- Frontend on Railway OR Vercel

**Environment variables**: ~12 required (see section above)

**Deploy time**: 15-20 minutes for initial setup

**Result**: Production-ready cycling dashboard with auto-scaling and managed infrastructure
