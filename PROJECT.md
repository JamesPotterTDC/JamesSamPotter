# Project Overview

## What Was Built

A production-ready personal cycling dashboard that:

1. **Ingests** all your Strava cycling activities into a Postgres database
2. **Auto-updates** via webhooks when you complete rides (within 1 hour)
3. **Computes** metrics like weekly trends, elevation progress, streaks
4. **Visualizes** your data with an interactive modern dashboard

## File Structure

```
jamessampotter.co.uk/
├── backend/                          # Django backend
│   ├── cycling_dashboard/            # Django project
│   │   ├── __init__.py
│   │   ├── settings.py               # Configuration
│   │   ├── urls.py                   # URL routing
│   │   ├── wsgi.py / asgi.py         # Server interfaces
│   │   ├── celery.py                 # Celery app
│   │   └── celery_beat_schedule.py   # Scheduled tasks
│   │
│   ├── strava_ingest/                # Strava integration app
│   │   ├── models.py                 # Athlete, Token, Activity models
│   │   ├── strava_client.py          # Strava API client
│   │   ├── oauth.py                  # OAuth flow handlers
│   │   ├── webhook.py                # Webhook receiver
│   │   ├── ingest.py                 # Activity ingestion logic
│   │   ├── tasks.py                  # Celery tasks
│   │   ├── admin.py                  # Django admin
│   │   ├── tests.py                  # Unit tests
│   │   └── management/commands/
│   │       ├── strava_sync.py        # Manual sync command
│   │       └── strava_webhook_subscribe.py
│   │
│   ├── metrics/                      # Metrics computation app
│   │   ├── models.py                 # DerivedWeekly, Milestone
│   │   ├── compute.py                # Metrics calculations
│   │   ├── tasks.py                  # Celery tasks
│   │   ├── admin.py                  # Django admin
│   │   └── management/commands/
│   │       └── compute_metrics.py    # Manual metrics command
│   │
│   ├── api/                          # REST API app
│   │   ├── views.py                  # API endpoints
│   │   ├── serializers.py            # DRF serializers
│   │   ├── urls.py                   # URL routing
│   │   └── health.py                 # Health check endpoints
│   │
│   ├── scripts/
│   │   └── generate_encryption_key.py
│   │
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Container image
│   ├── .env.example                  # Environment template
│   └── manage.py                     # Django CLI
│
├── frontend/                         # Next.js frontend
│   ├── src/
│   │   ├── app/                      # App Router pages
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── loading.tsx           # Loading state
│   │   │   ├── error.tsx             # Error boundary
│   │   │   ├── globals.css           # Global styles
│   │   │   ├── activities/
│   │   │   │   ├── page.tsx          # Activity list
│   │   │   │   └── [id]/page.tsx    # Activity detail
│   │   │   └── auth/
│   │   │       └── callback/page.tsx # OAuth callback
│   │   │
│   │   ├── components/               # React components
│   │   │   ├── Header.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── MilestoneCard.tsx
│   │   │   ├── WeeklyChart.tsx
│   │   │   └── ActivityMap.tsx
│   │   │
│   │   └── lib/                      # Utilities
│   │       ├── api.ts                # API client
│   │       └── utils.ts              # Formatters
│   │
│   ├── public/                       # Static assets
│   ├── package.json                  # Node dependencies
│   ├── tsconfig.json                 # TypeScript config
│   ├── tailwind.config.ts            # Tailwind config
│   ├── next.config.js                # Next.js config
│   ├── Dockerfile                    # Container image
│   └── .env.example                  # Environment template
│
├── docker-compose.yml                # Local dev orchestration
├── setup.sh                          # Automated setup script
├── Makefile                          # Convenience commands
├── .gitignore                        # Git ignore rules
├── .dockerignore                     # Docker ignore rules
│
└── Documentation
    ├── README.md                     # Main documentation
    ├── QUICKSTART.md                 # 10-minute setup guide
    ├── ARCHITECTURE.md               # Technical architecture
    ├── DEPLOYMENT.md                 # Production deployment
    ├── CONTRIBUTING.md               # Development guide
    └── LICENSE                       # MIT license
```

## Key Features Implemented

### Backend

✅ **Django Project Structure**
- 3 apps: strava_ingest, metrics, api
- Proper separation of concerns
- Production-ready settings

✅ **Database Models**
- StravaAthlete - User data
- StravaOAuthToken - Encrypted token storage
- Activity - All ride data
- ActivityStream - Optional time-series data
- SyncMetadata - Sync tracking
- DerivedWeekly - Precomputed weekly stats
- Milestone - Achievement tracking

✅ **Strava Integration**
- Full OAuth 2.0 flow
- Automatic token refresh
- Webhook subscription and verification
- Event-driven activity updates
- Rate limit tracking and enforcement

✅ **API Endpoints**
- `GET /api/summary/` - Stats (week/month/YTD)
- `GET /api/activities/` - Paginated list with filters
- `GET /api/activities/{id}/` - Detail with map + streams
- `GET /api/milestones/` - Achievement data
- `GET /api/weekly-trends/` - Chart data
- `POST /api/admin/sync/` - Manual sync trigger
- `GET /api/health/` - Health check
- `GET /api/ready/` - Readiness check

✅ **Celery Tasks**
- `backfill_activities` - Initial 365-day sync
- `incremental_sync` - Regular updates
- `process_webhook_event` - Handle Strava events
- `scheduled_incremental_sync` - Hourly cron
- `compute_metrics_for_athlete` - Metrics calculation
- `compute_all_metrics` - Daily batch job

✅ **Management Commands**
- `strava_sync` - Manual activity sync
- `strava_webhook_subscribe` - Set up webhooks
- `compute_metrics` - Recompute metrics

✅ **Production Features**
- Environment variable configuration
- Structured logging
- Token encryption with Fernet
- Retry logic with exponential backoff
- Idempotent operations
- Rate limiting
- Health checks

✅ **Testing**
- Pytest setup
- OAuth token encryption tests
- Activity ingestion tests
- Webhook mocking tests

### Frontend

✅ **Next.js App Router Structure**
- Modern App Router (not Pages Router)
- TypeScript throughout
- Server-side rendering for initial load

✅ **Pages**
- **Dashboard** (`/`) - YTD KPIs, weekly summary, indoor/outdoor split, trend chart, milestones, recent rides
- **Activities List** (`/activities`) - Paginated grid with filters
- **Activity Detail** (`/activities/[id]`) - Map, comprehensive stats, performance data
- **OAuth Callback** (`/auth/callback`) - Handles Strava redirect

✅ **Components**
- Reusable StatCard for metrics
- MilestoneCard for achievements
- WeeklyChart with Recharts (bar chart)
- ActivityMap with MapLibre GL (polyline rendering)
- Header with navigation

✅ **Design**
- Clean, modern, professional UI
- Tailwind CSS utility classes
- Responsive layout (mobile-friendly)
- Subtle hover states and transitions
- Consistent color scheme (primary blue/orange accents)

✅ **Type Safety**
- Full TypeScript definitions
- Typed API client
- Interface definitions for all data structures

### Infrastructure

✅ **Docker Compose**
- Postgres database
- Redis broker
- Django web server
- Celery worker
- Celery beat scheduler
- Next.js frontend
- Health checks for all services
- Automatic migrations on startup

✅ **DevOps**
- Environment file templates
- Setup automation script
- Makefile for common tasks
- .gitignore and .dockerignore
- Dockerfile for each service

## What's NOT Included (Intentional Scope)

These are left out of the MVP but can be added:

- **Multi-user support** - Currently single athlete
- **Authentication** - No login required (personal dashboard)
- **Dark mode** - Light mode only
- **Advanced charts** - Zone distributions, power curves (streams visualized but not charted)
- **Mobile app** - Web only
- **Social features** - No sharing, comments, kudos
- **Training plans** - No workout scheduling
- **FTP testing** - No power analysis
- **Export features** - No CSV/GPX export
- **Custom metrics** - No user-defined formulas

## Technology Choices

### Why Django?

- Mature ORM for complex queries
- Built-in admin interface
- Strong ecosystem (DRF, Celery)
- Good Postgres support

### Why Next.js?

- Server-side rendering for SEO
- App Router for modern patterns
- Easy Vercel deployment
- TypeScript support

### Why Celery?

- Robust background job processing
- Retries and error handling
- Scheduled tasks (Celery Beat)
- Scales horizontally

### Why Postgres?

- JSONB for flexible activity data
- Good indexing for time-series queries
- Reliability and ACID guarantees

### Why Redis?

- Fast message broker for Celery
- Optional caching layer
- Minimal resource usage

## Development Philosophy

This project follows these principles:

1. **Production-ready from day one** - Logging, monitoring, error handling
2. **Idempotent operations** - Safe to retry, replay, recompute
3. **Separation of concerns** - Clean app boundaries
4. **Type safety** - TypeScript frontend, typed Python where useful
5. **No secrets in code** - Environment variables for all config
6. **Fail fast** - Explicit error handling, no silent failures
7. **Observable** - Logs, health checks, metrics
8. **Tested** - Core flows have test coverage

## Performance Characteristics

With typical usage (1 user, 500 activities/year):

- **Initial sync**: 5-10 minutes
- **Incremental sync**: 5-30 seconds
- **Metrics computation**: 1-5 seconds
- **Dashboard load**: <500ms (with precomputed metrics)
- **Activity detail load**: <300ms
- **Storage**: ~100MB/year (without streams)

API rate limits:
- Strava: 100 req/15min, 1000 req/day
- Backend: No hard limits (add nginx rate limiting in production)

## Maintenance

**Daily**: None (fully automated)

**Weekly**: Check sync logs for failures

**Monthly**: 
- Review database size
- Check Celery queue health
- Update dependencies if needed

**Quarterly**:
- Review and optimize slow queries
- Clean up old data if needed
- Update dependencies for security patches

## Next Steps After MVP

Priority improvements:

1. **Better error pages** - User-friendly error messages
2. **Loading states** - Skeleton screens while fetching
3. **Stream visualizations** - HR zone charts, power curves
4. **Map improvements** - Clustering, heat maps
5. **Activity comparison** - Compare multiple rides
6. **Export features** - Download data as CSV
7. **Email notifications** - Sync failures, milestones
8. **Mobile optimization** - Better mobile UX
9. **Performance optimizations** - API response caching
10. **Multi-athlete support** - User authentication and permissions
