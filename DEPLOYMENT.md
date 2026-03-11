# Deployment Guide

Complete guide for deploying the Cycling Dashboard to production.

## Architecture Overview

```
Internet
    ↓
[Load Balancer / CDN]
    ↓
┌─────────────────┐         ┌──────────────────┐
│   Next.js App   │────────→│   Django API     │
│   (Frontend)    │         │   (Backend)      │
└─────────────────┘         └────────┬─────────┘
                                     │
                    ┌────────────────┼─────────────┐
                    ↓                ↓             ↓
            ┌──────────────┐  ┌──────────┐  ┌─────────┐
            │   Postgres   │  │  Redis   │  │ Celery  │
            │   Database   │  │  Cache   │  │ Workers │
            └──────────────┘  └──────────┘  └─────────┘
                                     ↑
                                     │
                              ┌──────────────┐
                              │ Celery Beat  │
                              │  (Scheduler) │
                              └──────────────┘
```

## Deployment Options

### Option 1: Railway (Recommended for MVP)

Railway provides an easy deployment with managed Postgres and Redis.

#### Backend Deployment

1. **Create Railway Project**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Create project
   railway init
   ```

2. **Add Services**
   - Add Postgres plugin
   - Add Redis plugin

3. **Deploy Backend**
   ```bash
   cd backend
   railway up
   ```

4. **Configure Environment Variables**

   In Railway dashboard, set:
   ```
   DEBUG=False
   DJANGO_SECRET_KEY=<generate-with-django-command>
   ALLOWED_HOSTS=your-backend-domain.railway.app
   CORS_ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   ENCRYPTION_KEY=<generate-with-script>
   ADMIN_API_TOKEN=<generate-random-token>
   STRAVA_WEBHOOK_VERIFY_TOKEN=<generate-random-token>
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```

5. **Deploy Celery Worker**
   - Create new service in same project
   - Same codebase, change start command to:
     ```
     celery -A cycling_dashboard worker --loglevel=info
     ```

6. **Deploy Celery Beat**
   - Create new service in same project
   - Same codebase, change start command to:
     ```
     celery -A cycling_dashboard beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
     ```

7. **Run Migrations**
   ```bash
   railway run python manage.py migrate
   railway run python manage.py createsuperuser
   ```

#### Frontend Deployment (Vercel)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Visit https://vercel.com
   - Import your repository
   - Set root directory to `frontend`
   - Add environment variable:
     ```
     NEXT_PUBLIC_API_URL=https://your-backend-domain.railway.app/api
     ```
   - Deploy

3. **Update Strava Settings**
   - Go to https://www.strava.com/settings/api
   - Update Authorization Callback Domain to your Vercel domain (e.g., `your-app.vercel.app`)

4. **Setup Webhooks**
   ```bash
   # From local machine with Railway CLI
   railway run python manage.py strava_webhook_subscribe \
     --callback-url https://your-backend-domain.railway.app/api/strava/webhook \
     --verify-token your_webhook_token
   ```

### Option 2: DigitalOcean App Platform

1. **Create App**
   - Connect GitHub repository
   - Auto-detect Dockerfile

2. **Add Components**
   - Web Service (backend)
   - Worker Service (celery worker)
   - Worker Service (celery beat)
   - Managed Postgres database
   - Managed Redis database

3. **Configure Environment Variables** (same as Railway)

4. **Deploy Frontend** to Vercel or Netlify

### Option 3: Self-Hosted (Docker Swarm / Kubernetes)

For advanced users who want full control.

**Docker Compose (Single Server)**

1. Copy `docker-compose.yml` to server
2. Set environment variables
3. Set up reverse proxy (nginx/Caddy)
4. Configure SSL with Let's Encrypt
5. Run: `docker-compose up -d`

**Kubernetes**

See `k8s/` directory for example manifests (not included in MVP, create if needed).

## Post-Deployment Checklist

### Security

- [ ] `DEBUG=False` in production
- [ ] Secure secret keys generated and set
- [ ] HTTPS enabled with valid certificates
- [ ] Database backups configured
- [ ] `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` properly set
- [ ] Admin endpoints protected with strong token
- [ ] Webhook endpoint has rate limiting (nginx/cloudflare)

### Monitoring

- [ ] Set up error tracking (Sentry, Rollbar)
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure log aggregation (Datadog, LogDNA)
- [ ] Set up alerts for sync failures
- [ ] Monitor Celery queue length

### Testing

- [ ] Test OAuth flow end-to-end
- [ ] Test webhook delivery with real Strava activity
- [ ] Test manual sync command
- [ ] Verify all API endpoints return data
- [ ] Test frontend on mobile devices

### Optimization

- [ ] Enable Cloudflare or CDN for frontend
- [ ] Configure database connection pooling
- [ ] Set up database query monitoring
- [ ] Enable Django's static file serving via whitenoise or CDN
- [ ] Configure Celery task priorities if needed

## Environment Variables Reference

### Backend

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DEBUG` | No | Debug mode | `False` |
| `DJANGO_SECRET_KEY` | Yes | Django secret | `random-50-char-string` |
| `ALLOWED_HOSTS` | Yes | Allowed domains | `api.example.com` |
| `CORS_ALLOWED_ORIGINS` | Yes | Frontend URLs | `https://example.com` |
| `DATABASE_URL` | Yes | Postgres connection | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Yes | Redis connection | `redis://host:6379/0` |
| `STRAVA_CLIENT_ID` | Yes | From Strava API | `12345` |
| `STRAVA_CLIENT_SECRET` | Yes | From Strava API | `abc123...` |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | Yes (for webhooks) | Random token | `random-hex-string` |
| `ENCRYPTION_KEY` | Yes | Fernet key | `generated-key` |
| `ADMIN_API_TOKEN` | Yes | Admin auth | `random-token` |
| `FRONTEND_URL` | Yes | Frontend URL | `https://example.com` |

### Frontend

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL | `https://api.example.com/api` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Mapbox token (optional) | `pk.xxx` |

## Database Maintenance

### Backups

**Automated Backups** (Railway/DO)
- Configure automatic daily backups in provider dashboard
- Set retention to 7-30 days

**Manual Backup**
```bash
# Export database
docker-compose exec db pg_dump -U postgres cycling_dashboard > backup.sql

# Restore
docker-compose exec -T db psql -U postgres cycling_dashboard < backup.sql
```

### Cleanup Old Data

```python
# In Django shell
from strava_ingest.models import Activity
from datetime import timedelta
from django.utils import timezone

# Delete activities older than 3 years
cutoff = timezone.now() - timedelta(days=365*3)
Activity.objects.filter(start_date__lt=cutoff).delete()
```

## Monitoring Queries

```sql
-- Check sync status
SELECT 
    a.firstname, a.lastname,
    sm.last_sync_completed_at,
    sm.last_sync_status,
    COUNT(act.id) as activity_count
FROM strava_athlete a
LEFT JOIN sync_metadata sm ON sm.athlete_id = a.id
LEFT JOIN activity act ON act.athlete_id = a.id
GROUP BY a.id, sm.id;

-- Recent activities
SELECT name, start_date, distance_m/1000 as distance_km, trainer
FROM activity
ORDER BY start_date DESC
LIMIT 10;

-- API performance
-- Add django-silk or django-debug-toolbar for query profiling
```

## Scaling for Multiple Users

When ready to support multiple users:

1. **Add Authentication**
   ```bash
   pip install dj-rest-auth djangorestframework-simplejwt
   ```

2. **Add User Model**
   - Link StravaAthlete to Django User
   - Add authentication to API endpoints
   - Add user-specific filtering

3. **Update Frontend**
   - Add login/logout UI
   - Store JWT tokens
   - Add authentication to API calls

4. **Scale Backend**
   - Add more Celery workers
   - Use Redis for API response caching
   - Consider read replicas for Postgres

See ARCHITECTURE.md for detailed scaling considerations.
