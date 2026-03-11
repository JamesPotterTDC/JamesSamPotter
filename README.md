# Cycling Dashboard

A full-stack personal cycling dashboard that ingests Strava activities into a Postgres database and provides an interactive web interface with charts, maps, and analytics.

**Repository**: https://github.com/JamesSamPotter/JamesSamPotter  
**Monorepo Structure**: Django backend + Next.js frontend

## Stack

- **Backend**: Django + Django REST Framework + Postgres + Celery + Redis
- **Frontend**: Next.js (App Router) + Tailwind CSS + Recharts
- **Infrastructure**: Docker Compose for local development

## Features

- **Strava Integration**: OAuth authentication and webhook-based activity ingestion
- **Real-time Updates**: Activities sync automatically within ~1 hour via webhooks
- **Comprehensive Analytics**: Distance, elevation, power, heart rate, cadence tracking
- **Indoor/Outdoor Split**: Separate tracking for trainer rides vs outdoor rides
- **Milestones**: Everest progress, streaks, personal records
- **Interactive Maps**: Route visualization with polyline rendering
- **Time-series Charts**: Weekly trends, zone distributions, power/HR curves
- **Privacy Protected**: Routes automatically redacted to hide start/end locations
- **Production-ready**: Logging, retries, idempotency, rate limiting

## Privacy & Security

This dashboard implements **defense-in-depth privacy protection**:

- 🔒 **Route Redaction**: Automatically removes first/last 10% of all route points
- 🔒 **No Start/End Locations**: Start and end coordinates never stored or exposed
- 🔒 **No GPS Streams**: Location streams not fetched by default
- 🔒 **Indoor Rides**: No map data for trainer activities
- 🔒 **Public Safe**: Designed for public deployment without exposing home/work addresses
- 🔒 **Encrypted Tokens**: OAuth tokens encrypted at rest (Fernet)

See `PRIVACY_CHANGES.md` for full details.

## Prerequisites

- Docker and Docker Compose
- Strava API application (see setup below)
- (Optional) ngrok for local webhook testing

## Quick Start

Run the automated setup script:

```bash
chmod +x setup.sh
./setup.sh
```

Or follow the manual steps below:

## Manual Setup

### 1. Create Strava API Application

1. Go to https://www.strava.com/settings/api
2. Create a new application with these settings:
   - **Application Name**: Your Dashboard Name
   - **Category**: Choose appropriate category
   - **Website**: http://localhost:3000 (or your domain)
   - **Authorization Callback Domain**: `localhost` (no protocol, no port)
3. Note your **Client ID** and **Client Secret**
4. Leave **Webhook Callback** empty for now (we'll set it up later)

### 2. Generate Encryption Key

```bash
cd backend
python scripts/generate_encryption_key.py
```

Copy the generated key for the next step.

### 3. Environment Configuration

Copy and configure the environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` with your Strava credentials:

```env
# Required
STRAVA_CLIENT_ID=your_client_id_from_strava
STRAVA_CLIENT_SECRET=your_client_secret_from_strava
ENCRYPTION_KEY=your_generated_encryption_key_from_step_2

# Optional (change in production)
DJANGO_SECRET_KEY=generate-a-secure-random-key-for-production
ADMIN_API_TOKEN=generate-a-secure-token-for-admin-endpoints

# These can stay as-is for local development
DEBUG=True
FRONTEND_URL=http://localhost:3000
```

### 4. Start Services

```bash
docker-compose up --build
```

This starts:
- **Postgres** (port 5432) - Database
- **Redis** (port 6379) - Message broker
- **Django backend** (port 8000) - API server
- **Celery worker** - Background job processor
- **Celery beat** - Scheduled task runner
- **Next.js frontend** (port 3000) - Web interface

Wait for all services to start (about 30 seconds).

### 5. Initialize Database

The migrations run automatically on startup. If needed, create a superuser:

```bash
docker-compose exec backend python manage.py createsuperuser
```

### 6. Connect to Strava

1. Visit http://localhost:3000
2. Click "Connect to Strava"
3. Authorize the application
4. You'll be redirected back and a background job will sync your last 365 days of activities
5. This initial sync may take 5-10 minutes depending on your activity count

### 7. Setup Webhooks (Recommended for Auto-Updates)

Webhooks enable real-time activity updates. For local development, you need to expose your backend publicly:

**Step 1: Expose backend with ngrok**

```bash
# In a separate terminal
ngrok http 8000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

**Step 2: Generate a webhook verify token**

```bash
# Generate a random token
openssl rand -hex 32
```

Add this to `backend/.env`:

```env
STRAVA_WEBHOOK_VERIFY_TOKEN=your_generated_token
```

Restart the backend:

```bash
docker-compose restart backend
```

**Step 3: Subscribe to webhooks**

```bash
docker-compose exec backend python manage.py strava_webhook_subscribe \
  --callback-url https://your-ngrok-url.ngrok.io/api/strava/webhook \
  --verify-token your_generated_token
```

You should see a success message with a subscription ID.

**Note**: For production, use your actual domain instead of ngrok.

## API Endpoints

### Public
- `GET /api/summary` - Aggregate stats (week/month/YTD)
- `GET /api/activities` - Paginated activity list
- `GET /api/activities/{id}` - Activity detail with map + streams
- `GET /api/milestones` - Achievement tracking
- `GET /api/strava/oauth/start` - Initiate OAuth flow
- `GET /api/strava/oauth/callback` - OAuth callback handler

### Webhooks
- `GET /api/strava/webhook` - Webhook verification
- `POST /api/strava/webhook` - Activity event receiver

### Admin
- `POST /api/admin/sync` - Manual sync trigger (requires admin token)

## Management Commands

### Sync Activities

```bash
# Manual sync (backfill last 365 days)
docker-compose exec backend python manage.py strava_sync --days 365

# Sync recent activities only
docker-compose exec backend python manage.py strava_sync --days 7

# Sync specific athlete
docker-compose exec backend python manage.py strava_sync --athlete-id 1 --days 30
```

### Compute Metrics

```bash
# Recompute all metrics for all athletes
docker-compose exec backend python manage.py compute_metrics

# Compute metrics for specific athlete
docker-compose exec backend python manage.py compute_metrics --athlete-id 1
```

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# Celery worker logs
docker-compose logs -f celery_worker

# All services
docker-compose logs -f
```

### Database Access

```bash
# Access Postgres CLI
docker-compose exec db psql -U postgres -d cycling_dashboard

# Run Django shell
docker-compose exec backend python manage.py shell
```

## Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting

### Activities not syncing

1. Check Celery worker is running: `docker-compose ps`
2. View Celery logs: `docker-compose logs -f celery_worker`
3. Manually trigger sync: `docker-compose exec backend python manage.py strava_sync --days 7`
4. Check token hasn't expired in Django admin: http://localhost:8000/admin

### Webhooks not working

1. Verify ngrok is running and URL hasn't changed
2. Check webhook subscription: Visit https://www.strava.com/settings/api (view your application)
3. Test webhook endpoint: `curl http://localhost:8000/api/strava/webhook?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test`
4. Check webhook logs: `docker-compose logs -f backend`

### Frontend not loading data

1. Verify backend is accessible: `curl http://localhost:8000/api/summary/`
2. Check frontend environment: `cat frontend/.env`
3. Check browser console for CORS errors
4. Restart frontend: `docker-compose restart frontend`

## Production Deployment

**Railway** (Backend): See [DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)  
**Vercel** (Frontend): Import repo, set root directory to `frontend`, add `NEXT_PUBLIC_API_URL` env var

Quick Railway setup:
1. Create project, add Postgres + Redis plugins
2. Deploy 3 services from same repo: backend-web, backend-worker, backend-beat
3. Configure environment variables (see DEPLOY_RAILWAY.md)
4. Update Strava callback URLs

## Deployment Notes

### Security Checklist

- [ ] Set `DEBUG=False` in production
- [ ] Generate and set secure `DJANGO_SECRET_KEY` (use `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- [ ] Generate and set secure `ADMIN_API_TOKEN`
- [ ] Generate and set secure `ENCRYPTION_KEY` (use the generate script)
- [ ] Configure `ALLOWED_HOSTS` with your domain
- [ ] Configure `CORS_ALLOWED_ORIGINS` with your frontend URL
- [ ] Use SSL/TLS certificates (Let's Encrypt)
- [ ] Use managed Postgres and Redis services
- [ ] Configure webhook callback URL to production domain
- [ ] Set up rate limiting on webhook endpoint (nginx/cloudflare)
- [ ] Enable database backups
- [ ] Set up monitoring and alerting for sync failures

### Deployment Platforms

**Backend (Django + Celery)**
- Railway, Render, Fly.io, DigitalOcean App Platform
- Requires: Web service + Worker service + Redis + Postgres

**Frontend (Next.js)**
- Vercel, Netlify, Cloudflare Pages
- Set `NEXT_PUBLIC_API_URL` to your backend API URL

**Example: Railway Deployment**

1. Create new project in Railway
2. Add Postgres and Redis plugins
3. Deploy backend (web + worker services)
4. Deploy frontend
5. Configure environment variables
6. Run migrations: `railway run python manage.py migrate`
7. Set up webhook with production URL

## Architecture

```
┌─────────────┐
│   Strava    │
└──────┬──────┘
       │ OAuth + Webhooks
       ▼
┌─────────────────────────────────┐
│     Django Backend (8000)       │
│  ┌──────────┐  ┌─────────────┐ │
│  │  OAuth   │  │  Webhooks   │ │
│  └────┬─────┘  └──────┬──────┘ │
│       │                │        │
│       ▼                ▼        │
│  ┌───────────────────────────┐ │
│  │    Celery Workers         │ │
│  │  (Sync + Metrics Jobs)    │ │
│  └───────────┬───────────────┘ │
│              │                  │
│              ▼                  │
│  ┌───────────────────────────┐ │
│  │      Postgres DB          │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │      REST API (DRF)       │ │
│  └───────────┬───────────────┘ │
└──────────────┼─────────────────┘
               │
               ▼
    ┌─────────────────────┐
    │  Next.js Frontend   │
    │  (3000)             │
    │  - Dashboard        │
    │  - Activities       │
    │  - Maps + Charts    │
    └─────────────────────┘
```

## License

MIT
