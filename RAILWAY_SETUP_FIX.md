# Railway Setup - Root Directory Fix

## The Problem

Railway tried to build from the root directory but this is a **monorepo** with separate `backend/` and `frontend/` directories.

## The Solution

When creating each Railway service, you **MUST** set the **Root Directory** setting.

---

## Step-by-Step Fix

### 1. Create Backend Web Service

1. Railway Dashboard → Click "New"
2. Select "GitHub Repo" → Choose `JamesSamPotter`
3. **CRITICAL**: Click "Settings" → **Root Directory** → Enter: `backend`
4. Start Command (optional, already in railway.toml):
   ```
   python manage.py migrate && python manage.py collectstatic --noinput && gunicorn cycling_dashboard.wsgi:application --bind 0.0.0.0:$PORT --workers 4
   ```
5. Add environment variables (see below)
6. Deploy

### 2. Create Backend Worker Service

1. Railway Dashboard → Click "New"
2. Select "GitHub Repo" → Choose `JamesSamPotter`
3. **CRITICAL**: Settings → **Root Directory** → Enter: `backend`
4. Start Command:
   ```
   celery -A cycling_dashboard worker --loglevel=info --concurrency=2
   ```
5. Add same environment variables
6. Deploy

### 3. Create Backend Beat Service

1. Railway Dashboard → Click "New"
2. Select "GitHub Repo" → Choose `JamesSamPotter`
3. **CRITICAL**: Settings → **Root Directory** → Enter: `backend`
4. Start Command:
   ```
   celery -A cycling_dashboard beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
   ```
5. Add same environment variables
6. Deploy

### 4. Create Frontend Service (Optional)

1. Railway Dashboard → Click "New"
2. Select "GitHub Repo" → Choose `JamesSamPotter`
3. **CRITICAL**: Settings → **Root Directory** → Enter: `frontend`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-web.railway.app/api
   ```
5. Deploy

**OR** deploy frontend to Vercel (recommended):
- Import repo from GitHub
- Set Root Directory: `frontend`
- Add env var: `NEXT_PUBLIC_API_URL`

---

## Environment Variables (All Backend Services)

```bash
# Required
DJANGO_SECRET_KEY=<generate with command below>
ENCRYPTION_KEY=<generate with command below>
STRAVA_CLIENT_ID=<from strava.com/settings/api>
STRAVA_CLIENT_SECRET=<from strava.com/settings/api>
STRAVA_WEBHOOK_VERIFY_TOKEN=<generate with command below>
ADMIN_API_TOKEN=<generate with command below>

# Update after deployment
ALLOWED_HOSTS=your-backend-web.railway.app
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-frontend.vercel.app

# Defaults (can customize)
DEBUG=False
MAP_REDACT_PERCENT=10
STRAVA_FETCH_STREAMS=False
```

### Generate Secrets

```bash
# Django secret key
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Encryption key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Admin token
openssl rand -hex 32

# Webhook verify token
openssl rand -hex 32
```

---

## Quick Railway UI Guide

### Setting Root Directory (MOST IMPORTANT)

**Method 1: During Initial Setup**
- When adding the GitHub repo, Railway may show "Configure" button
- Click it and set Root Directory before first deploy

**Method 2: After Service Created**
1. Click on the service card
2. Go to "Settings" tab
3. Find "Root Directory" field
4. Enter `backend` or `frontend`
5. Click away to save
6. Redeploy

### Setting Start Command

1. Click service card
2. Go to "Settings" tab
3. Find "Start Command" (under Deploy section)
4. Paste the command for that service type
5. Save

### Adding Environment Variables

1. Click service card
2. Go to "Variables" tab
3. Click "New Variable"
4. Paste name and value
5. Click "Add"
6. Repeat for all variables

**OR** use "Raw Editor":
1. Variables tab → "Raw Editor"
2. Paste all variables (KEY=value format)
3. Click "Update"

---

## Verification After Deploy

```bash
# Check backend health
curl https://your-backend-web.up.railway.app/api/health/

# Should return:
# {"status":"healthy","checks":{"database":"ok","redis":"ok"}}

# Check backend is serving API
curl https://your-backend-web.up.railway.app/api/summary/

# Check no location data leaked
curl https://your-backend-web.up.railway.app/api/activities/ | grep "start_latlng"
# Should return nothing
```

---

## Common Issues

### Issue: "Nixpacks build failed"
**Cause**: Root Directory not set
**Fix**: Set Root Directory to `backend` or `frontend` in service settings

### Issue: "Module not found" errors
**Cause**: Wrong root directory or missing dependencies
**Fix**: Verify root directory is correct, check logs

### Issue: "Port already in use"
**Cause**: Multiple services trying to use same port
**Fix**: Railway assigns PORT automatically, make sure start command uses `$PORT`

### Issue: Database connection errors
**Cause**: DATABASE_URL not available
**Fix**: Add Postgres plugin to Railway project (see DEPLOY_RAILWAY.md)

### Issue: Redis connection errors
**Cause**: REDIS_URL not available
**Fix**: Add Redis plugin to Railway project

---

## Summary

✅ **Backend services need**: Root Directory = `backend`  
✅ **Frontend service needs**: Root Directory = `frontend`  
✅ **All backend services need**: Same environment variables  
✅ **Railway plugins needed**: Postgres + Redis (add before services)

---

## Next Steps

1. Delete any failed deployments in Railway
2. Create services again with correct Root Directory settings
3. Add environment variables
4. Deploy
5. Run verification commands above
