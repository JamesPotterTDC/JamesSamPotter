# Contributing

## Development Setup

### Local Development (Without Docker)

**Backend:**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Generate encryption key
python scripts/generate_encryption_key.py

# Start Postgres and Redis (via Docker or locally)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine
docker run -d -p 6379:6379 redis:7-alpine

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start Django dev server
python manage.py runserver

# In separate terminals:
celery -A cycling_dashboard worker --loglevel=info
celery -A cycling_dashboard beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

**Frontend:**

```bash
cd frontend
npm install

# Set up environment
cp .env.example .env

# Start dev server
npm run dev
```

### Code Style

**Python (Backend)**
- Follow PEP 8
- Use type hints where appropriate
- Write docstrings for public functions
- Keep functions focused and single-purpose

**TypeScript (Frontend)**
- Use TypeScript strict mode
- Define interfaces for all data structures
- Prefer functional components
- Use Tailwind for styling (avoid custom CSS)

### Testing

**Backend:**

```bash
# Run all tests
pytest

# Run specific test file
pytest strava_ingest/tests.py

# Run with coverage
pytest --cov=strava_ingest --cov=metrics --cov=api
```

**Frontend:**

```bash
# Type check
npm run build
```

### Database Migrations

When changing models:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

Review the generated migration before committing.

### Adding New Features

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Implement changes with tests
3. Update documentation if needed
4. Test locally with Docker Compose
5. Submit pull request

### Debugging

**View Celery task status:**

```bash
# Django shell
docker-compose exec backend python manage.py shell

# In shell:
from strava_ingest.models import SyncMetadata
SyncMetadata.objects.all()
```

**Check Strava API rate limits:**

```bash
# In Django shell
from strava_ingest.strava_client import StravaClient
client = StravaClient()
print(client.rate_limiter.short_usage, client.rate_limiter.short_limit)
```

**Inspect activity data:**

```bash
docker-compose exec db psql -U postgres -d cycling_dashboard
SELECT name, start_date, distance_m, trainer FROM activity ORDER BY start_date DESC LIMIT 10;
```

## Common Tasks

### Adding a New Metric

1. Add computation logic to `metrics/compute.py`
2. Create/update `Milestone` record with the new metric
3. Add API endpoint if needed in `api/views.py`
4. Create frontend component to display it

### Adding a New API Endpoint

1. Add view function/viewset to `api/views.py`
2. Add URL pattern to `api/urls.py`
3. Update frontend `src/lib/api.ts` with typed function
4. Write tests in `api/tests.py`

### Handling Strava API Changes

If Strava adds/changes fields:
1. Update `Activity` model in `strava_ingest/models.py`
2. Create and run migration
3. Update `save_activity_from_strava()` in `ingest.py`
4. Update serializers in `api/serializers.py`
5. Update frontend types in `src/lib/api.ts`
