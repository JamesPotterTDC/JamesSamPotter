# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-18

### Added - Initial MVP Release

#### Backend
- Django 5.0 project structure with 3 apps (strava_ingest, metrics, api)
- PostgreSQL database models for athletes, activities, metrics, milestones
- Strava OAuth 2.0 integration with automatic token refresh
- Encrypted OAuth token storage using Fernet
- Strava webhook subscription and event processing
- Rate-limited Strava API client (100 req/15min, 1000 req/day)
- Activity ingestion with idempotent updates
- Celery tasks for background processing:
  - Initial backfill (365 days)
  - Incremental sync (hourly)
  - Webhook event processing
  - Metrics computation (daily)
- REST API with Django REST Framework:
  - Summary endpoint (week/month/YTD stats)
  - Activities list with pagination and filters
  - Activity detail with map polyline and streams
  - Milestones endpoint
  - Weekly trends for charts
  - Admin sync trigger (protected)
  - Health check endpoints
- Management commands:
  - `strava_sync` - Manual activity sync
  - `strava_webhook_subscribe` - Webhook setup
  - `compute_metrics` - Metrics recomputation
- Precomputed weekly metrics (DerivedWeekly table)
- Milestone tracking:
  - Everest Challenge (YTD and monthly)
  - Current streak
  - Longest ride
- Comprehensive logging throughout
- Retry logic with exponential backoff
- pytest test suite with 15+ test cases

#### Frontend
- Next.js 14 with App Router and TypeScript
- Tailwind CSS for styling
- Server-side rendering for all pages
- Dashboard homepage with:
  - YTD summary cards (distance, time, elevation, energy)
  - This week stats
  - Indoor/outdoor split
  - Weekly trend chart (Recharts bar chart)
  - Milestone cards with progress bars
  - Recent activities list
- Activities list page with:
  - Pagination
  - Indoor/outdoor filters
  - Comprehensive stat display per activity
- Activity detail page with:
  - MapLibre GL map with route polyline
  - Key stats grid
  - Power/HR/cadence metrics
  - Link to Strava
- OAuth callback handler
- Typed API client with full interfaces
- Format utilities (distance, time, pace, elevation)
- Responsive design (mobile-friendly)
- Loading and error states
- Clean, modern UI

#### Infrastructure
- Docker Compose configuration for local development
- Docker Compose production configuration
- Dockerfiles for backend and frontend
- Multi-stage frontend build (dev + prod)
- PostgreSQL 15 Alpine
- Redis 7 Alpine
- Health checks for all services
- Automatic database migrations on startup
- Volume persistence for database

#### DevOps
- Environment variable templates (.env.example)
- Automated setup script (setup.sh)
- Makefile with common commands
- .gitignore and .dockerignore
- .editorconfig for consistent formatting

#### Documentation
- README.md - Main documentation with architecture diagram
- QUICKSTART.md - 10-minute setup guide
- ARCHITECTURE.md - Technical deep dive
- DEPLOYMENT.md - Production deployment guide (Railway, Vercel, DO)
- CONTRIBUTING.md - Development guidelines
- TESTING.md - Testing strategy and execution
- PROJECT.md - File structure and feature overview
- SUMMARY.md - Build summary
- MIT License

### Security
- OAuth token encryption (Fernet)
- No secrets in code (environment variables)
- CSRF protection
- CORS configuration
- Admin endpoint authentication
- Password validators

### Performance
- Database indexes on key fields (strava_id, start_date, athlete+date)
- Precomputed metrics for fast dashboard queries
- Pagination on all list endpoints
- Selective stream fetching (only when needed)
- Rate limit tracking and enforcement

### Developer Experience
- Hot reload in development
- Comprehensive error messages
- Type safety throughout frontend
- Clear separation of concerns
- Well-documented code
- Easy local setup (one command)

## [Unreleased]

### Planned Features
- Dark mode support
- Advanced stream visualizations (HR zones, power curves)
- Activity comparison
- CSV/GPX export
- Multi-athlete support
- User authentication
- Email notifications
- Mobile app

---

## Version History

- **0.1.0** (2026-02-18) - Initial MVP release
