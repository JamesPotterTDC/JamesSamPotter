# Testing Guide

## Backend Testing

### Setup Test Environment

```bash
# Using Docker
docker-compose exec backend pytest

# Local development
cd backend
source venv/bin/activate
pytest
```

### Running Tests

```bash
# All tests
pytest

# Specific app
pytest strava_ingest/tests.py

# With coverage
pytest --cov=strava_ingest --cov=metrics --cov=api --cov-report=html

# Verbose output
pytest -v

# Stop on first failure
pytest -x
```

### Test Categories

**Unit Tests** - `strava_ingest/tests.py`
- OAuth token encryption/decryption
- Token expiry detection
- Activity ingestion idempotency
- Activity filtering

**Integration Tests** - `api/tests.py` (create if needed)
- API endpoint responses
- Pagination
- Filtering
- Error handling

**Task Tests** - `strava_ingest/tests.py`
- Celery task mocking
- Webhook event processing
- Retry behavior

### Writing New Tests

```python
import pytest
from strava_ingest.models import StravaAthlete

@pytest.mark.django_db
class TestYourFeature:
    def test_something(self):
        athlete = StravaAthlete.objects.create(
            strava_id=123,
            firstname='Test',
            lastname='User'
        )
        assert athlete.strava_id == 123
```

## Frontend Testing

### Type Checking

```bash
cd frontend
npm run build
```

This will catch TypeScript errors.

### Manual Testing Checklist

**Dashboard Page**
- [ ] YTD stats display correctly
- [ ] This week summary shows current data
- [ ] Indoor/outdoor split is accurate
- [ ] Weekly chart renders with 12 weeks
- [ ] Milestone cards display progress
- [ ] Recent activities list shows 5 rides
- [ ] Links navigate correctly

**Activities Page**
- [ ] List displays paginated activities
- [ ] Filters work (All/Indoor/Outdoor)
- [ ] Pagination works (Previous/Next)
- [ ] Activity cards show correct data
- [ ] Click navigates to detail page

**Activity Detail Page**
- [ ] Map renders with route polyline
- [ ] Key stats are accurate
- [ ] Power/HR data displays if available
- [ ] "View on Strava" link works
- [ ] Back button navigates to list

**OAuth Flow**
- [ ] "Connect to Strava" redirects properly
- [ ] Authorization page displays
- [ ] Callback redirects to dashboard
- [ ] Initial sync starts automatically
- [ ] Error states handle gracefully

## Integration Testing

### End-to-End Flow Test

1. **Start fresh**
   ```bash
   docker-compose down -v
   docker-compose up -d
   sleep 30
   ```

2. **Initialize**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

3. **OAuth Flow**
   - Visit http://localhost:3000
   - Click "Connect to Strava"
   - Authorize
   - Verify redirect to dashboard
   - Check Celery logs: `docker-compose logs celery_worker`

4. **Wait for Sync**
   ```bash
   # Monitor sync progress
   docker-compose exec backend python manage.py shell
   ```
   
   ```python
   from strava_ingest.models import SyncMetadata, Activity
   sm = SyncMetadata.objects.first()
   print(f"Status: {sm.last_sync_status}")
   print(f"Activities: {Activity.objects.count()}")
   ```

5. **Verify Dashboard**
   - Refresh http://localhost:3000
   - Check all stats are populated
   - Click through to activities list
   - View activity detail

6. **Test Webhook** (if configured)
   - Complete a ride on Strava
   - Check webhook logs: `docker-compose logs backend | grep webhook`
   - Verify activity appears within 1 hour

### API Testing

```bash
# Health check
curl http://localhost:8000/api/health/

# Summary endpoint
curl http://localhost:8000/api/summary/

# Activities list
curl http://localhost:8000/api/activities/

# Activity detail
curl http://localhost:8000/api/activities/1/

# Milestones
curl http://localhost:8000/api/milestones/

# Weekly trends
curl http://localhost:8000/api/weekly-trends/?weeks=12
```

### Load Testing

For performance testing:

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Test summary endpoint
hey -n 1000 -c 10 http://localhost:8000/api/summary/

# Test activities list
hey -n 1000 -c 10 http://localhost:8000/api/activities/
```

Expected results:
- Summary: <200ms p95
- Activities list: <300ms p95

## Debugging Tests

### Backend

```bash
# Run with print statements visible
pytest -s

# Debug specific test
pytest strava_ingest/tests.py::TestOAuthToken::test_token_encryption -v

# Drop into debugger on failure
pytest --pdb
```

### Common Test Issues

**Database connection errors**
- Ensure Postgres is running
- Check DATABASE_URL in test settings

**Import errors**
- Run from project root: `cd backend && pytest`
- Ensure DJANGO_SETTINGS_MODULE is set

**Rate limit errors in integration tests**
- Mock Strava API calls
- Use fixtures instead of real API

## CI/CD Testing

Example GitHub Actions workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
```

## Manual Test Data

To test without real Strava data:

```python
# In Django shell
from strava_ingest.models import StravaAthlete, Activity
from django.utils import timezone

athlete = StravaAthlete.objects.create(
    strava_id=999,
    firstname='Test',
    lastname='User'
)

Activity.objects.create(
    athlete=athlete,
    strava_id=111,
    name='Test Ride',
    type='Ride',
    start_date=timezone.now(),
    distance_m=25000,
    moving_time_s=3600,
    total_elevation_gain_m=250,
    trainer=False,
    raw_json={}
)
```

Then run metrics computation:

```bash
docker-compose exec backend python manage.py compute_metrics --athlete-id 1
```
