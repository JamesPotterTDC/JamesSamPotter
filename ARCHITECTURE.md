# Architecture Overview

## System Components

### Backend (Django)

#### Apps

1. **strava_ingest** - Handles all Strava API interactions
   - OAuth flow (authorization and token refresh)
   - Webhook subscription and event processing
   - Activity ingestion and storage
   - Strava API client with rate limiting

2. **metrics** - Computes derived metrics and milestones
   - Weekly aggregates (precomputed for fast queries)
   - Milestone tracking (Everest progress, streaks, PRs)
   - Scheduled metric computation

3. **api** - REST API for frontend
   - Activity endpoints (list, detail)
   - Summary statistics (week, month, YTD)
   - Milestone endpoints
   - Admin endpoints (manual sync trigger)

#### Key Modules

**strava_client.py** - Strava API v3 client
- Automatic token refresh
- Rate limit tracking and enforcement
- Exponential backoff for retries

**ingest.py** - Activity ingestion logic
- Idempotent updates (by strava_id)
- Optional stream fetching
- Sync metadata tracking

**compute.py** - Metrics computation
- Weekly aggregates grouped by Monday-start weeks
- Milestone detection and progress tracking
- Efficient bulk queries

#### Database Models

```
StravaAthlete
├── StravaOAuthToken (1:1)
├── Activity (1:many)
├── SyncMetadata (1:1)
├── DerivedWeekly (1:many)
└── Milestone (1:many)

Activity
└── ActivityStream (1:1, optional)
```

#### Celery Tasks

- `backfill_activities(athlete_id, days)` - Initial sync
- `incremental_sync(athlete_id)` - Regular updates
- `process_webhook_event(...)` - Handle webhook events
- `scheduled_incremental_sync()` - Hourly cron job
- `compute_metrics_for_athlete(athlete_id)` - Metrics recomputation
- `compute_all_metrics()` - Daily metrics batch job

### Frontend (Next.js)

#### Pages

1. **/** - Dashboard home
   - YTD summary cards
   - This week stats
   - Indoor/outdoor split
   - Weekly trend chart
   - Milestone cards
   - Recent activities list

2. **/activities** - Activity list
   - Paginated grid
   - Filters (indoor/outdoor)
   - Quick stats per activity

3. **/activities/[id]** - Activity detail
   - Route map with polyline
   - Comprehensive stats
   - Stream data visualization (HR, power)

4. **/auth/callback** - OAuth redirect handler

#### Components

- `Header` - Navigation bar
- `StatCard` - Reusable stat display
- `MilestoneCard` - Achievement cards
- `WeeklyChart` - Recharts bar chart
- `ActivityMap` - MapLibre GL map with route overlay

#### API Client

All API calls go through `src/lib/api.ts` which provides typed functions for:
- `fetchSummary()` - Aggregate stats
- `fetchActivities()` - Paginated list
- `fetchActivity(id)` - Detail view
- `fetchMilestones()` - Achievements
- `fetchWeeklyTrends()` - Chart data

## Data Flow

### OAuth Flow

```
User clicks "Connect to Strava"
    ↓
Frontend redirects to Strava OAuth
    ↓
User authorizes
    ↓
Strava redirects to /api/strava/oauth/callback
    ↓
Backend exchanges code for token
    ↓
Token encrypted and stored in DB
    ↓
Athlete record created
    ↓
Celery task queued: backfill_activities(athlete_id, days=365)
    ↓
Redirect to frontend with success
```

### Webhook Flow

```
Activity created/updated on Strava
    ↓
Strava POST to /api/strava/webhook
    ↓
Backend validates and returns 200 immediately
    ↓
Celery task queued: process_webhook_event(...)
    ↓
Worker fetches activity detail from Strava API
    ↓
Activity saved/updated idempotently
    ↓
Metrics recomputation triggered
```

### Sync Flow

```
Hourly cron (Celery Beat) triggers scheduled_incremental_sync
    ↓
For each athlete:
    ↓
Celery task queued: incremental_sync(athlete_id)
    ↓
Fetch activities since last sync (or last 7 days)
    ↓
Save activities idempotently
    ↓
Update SyncMetadata
    ↓
Trigger metrics computation
```

### Metrics Flow

```
New activity ingested
    ↓
compute_metrics_for_athlete task triggered
    ↓
Compute weekly aggregates:
  - Query activities grouped by week
  - Calculate totals (distance, time, elevation, etc.)
  - Split indoor/outdoor
  - Update or create DerivedWeekly records
    ↓
Compute milestones:
  - Everest progress (YTD and monthly elevation)
  - Current streak (consecutive days)
  - Longest ride
  - Store in Milestone table
```

## Rate Limiting

Strava API limits:
- **15-minute**: 100 requests
- **Daily**: 1,000 requests

Implementation:
- `StravaRateLimiter` tracks usage from response headers
- Automatic wait when approaching limits (90% of 15-min limit)
- Error thrown when approaching daily limit (95%)

## Idempotency

All ingestion is idempotent:
- Activities identified by unique `strava_id`
- `update_or_create()` ensures no duplicates
- Webhook events can be replayed safely
- Metrics recomputation is deterministic

## Security

1. **Token Encryption**: OAuth tokens encrypted with Fernet (symmetric)
2. **CORS**: Configured for frontend domain only
3. **Admin Protection**: Admin endpoints require bearer token
4. **CSRF**: Enabled for all non-API endpoints
5. **Environment Variables**: No secrets in code

## Performance Optimizations

1. **Precomputed Metrics**: DerivedWeekly table for fast dashboard queries
2. **Pagination**: All list endpoints paginated
3. **Selective Stream Fetching**: Streams only fetched when needed
4. **Database Indexes**: On frequently queried fields (strava_id, start_date, athlete+date)
5. **Caching**: Frontend uses aggressive API caching

## Monitoring

Key metrics to monitor:
- Celery queue length (Redis)
- Sync failure rate (SyncMetadata.last_sync_status)
- API response times
- Strava API rate limit usage
- Database query performance

## Scaling Considerations

For multiple users:
- Add authentication (Django AllAuth + JWT)
- Add per-user access control
- Increase Celery worker count
- Add Redis caching layer for API responses
- Consider Postgres read replicas for analytics
- Implement background job prioritization
