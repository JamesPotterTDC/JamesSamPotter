# Validation Checklist

Run these commands to verify the cycling dashboard works correctly and is privacy-safe.

## Prerequisites

```bash
cd /Users/jamespotterdc/jamessampotter.co.uk
```

## Phase 1: Code Validation

### 1.1 Python Syntax Check

```bash
python3 -m py_compile backend/strava_ingest/privacy.py
python3 -m py_compile backend/strava_ingest/ingest.py
python3 -m py_compile backend/api/serializers.py
```

Expected: No output = success

### 1.2 TypeScript Check (requires Node)

```bash
cd frontend
npm install
npx tsc --noEmit
cd ..
```

Expected: No errors

## Phase 2: Privacy Tests

### 2.1 Setup Test Environment

```bash
# Start Postgres and Redis for tests
docker-compose up -d db redis
sleep 10
```

### 2.2 Run Privacy Tests

```bash
docker-compose exec backend pytest strava_ingest/tests_privacy.py -v
```

Expected output:
```
test_encode_decode_round_trip PASSED
test_decode_empty PASSED
test_encode_empty PASSED
test_redact_removes_start_end PASSED
test_redact_short_polyline_returns_empty PASSED
test_redact_configurable_percent PASSED
test_redact_empty_polyline PASSED
test_redact_invalid_polyline PASSED
test_activity_list_no_location_data PASSED
test_activity_detail_no_precise_location PASSED
test_streams_no_latlng PASSED
test_indoor_activity_no_map PASSED

12 passed
```

### 2.3 Run All Backend Tests

```bash
docker-compose exec backend pytest -v
```

Expected: All tests pass (27+ total)

## Phase 3: Service Health Check

### 3.1 Start All Services

```bash
docker-compose up -d
sleep 30
```

### 3.2 Verify Services Running

```bash
docker-compose ps
```

Expected: All 6 services "Up"
- db (postgres)
- redis
- backend
- celery_worker
- celery_beat
- frontend

### 3.3 Check Service Health

```bash
# Backend health
curl http://localhost:8000/api/health/

# Expected: {"status":"healthy","checks":{"database":"ok","redis":"ok"}}

# Backend readiness
curl http://localhost:8000/api/ready/

# Expected: {"status":"ready"}

# Frontend (should return HTML)
curl -I http://localhost:3000

# Expected: HTTP/1.1 200 OK
```

### 3.4 Check Logs for Errors

```bash
docker-compose logs backend | grep -i error | head -20
docker-compose logs celery_worker | grep -i error | head -20
```

Expected: No critical errors (some warnings OK)

## Phase 4: Privacy Verification

### 4.1 Create Test Data

```bash
docker-compose exec backend python manage.py shell
```

```python
from strava_ingest.models import StravaAthlete, Activity
from django.utils import timezone
from strava_ingest.privacy import encode_polyline, redact_polyline

# Create test athlete
athlete = StravaAthlete.objects.create(
    strava_id=999999,
    firstname='Test',
    lastname='User'
)

# Create test polyline (50 points)
test_coords = [(51.5 + i * 0.001, -0.1 + i * 0.001) for i in range(50)]
test_polyline = encode_polyline(test_coords)
redacted = redact_polyline(test_polyline)

# Create activity
activity = Activity.objects.create(
    athlete=athlete,
    strava_id=888888,
    name='Privacy Test Ride',
    type='Ride',
    start_date=timezone.now(),
    distance_m=25000,
    moving_time_s=3600,
    trainer=False,
    map_polyline_summary=test_polyline,
    map_polyline_redacted=redacted,
    start_latlng=None,
    end_latlng=None,
    raw_json={}
)

print(f"Created activity {activity.id}")
exit()
```

### 4.2 Test API Privacy

```bash
# Get activity list
curl http://localhost:8000/api/activities/ | python3 -m json.tool > /tmp/list.json

# Verify NO location data
grep -E "start_latlng|end_latlng" /tmp/list.json
# Expected: No output (fields not present)

# Get activity detail
ACTIVITY_ID=<ID from above>
curl http://localhost:8000/api/activities/$ACTIVITY_ID/ | python3 -m json.tool > /tmp/detail.json

# Verify NO precise location
grep -E "start_latlng|end_latlng" /tmp/detail.json
# Expected: No output

# Verify redacted polyline present
grep "map_polyline" /tmp/detail.json
# Expected: "map_polyline": "shortened_polyline_string"

# Verify no latlng in streams
grep "latlng" /tmp/detail.json
# Expected: No output
```

### 4.3 Test Frontend Privacy

```bash
# Open in browser
open http://localhost:3000

# Verify:
# - Footer shows "Routes are automatically redacted"
# - Activity detail page shows "Route redacted for privacy" badge
# - Map shows route middle only (not full route)
```

## Phase 5: Webhook Safety

### 5.1 Verify Quick Response

```bash
# Simulate webhook (without CSRF token)
time curl -X POST http://localhost:8000/api/strava/webhook/ \
  -H "Content-Type: application/json" \
  -d '{"object_type":"activity","aspect_type":"create","object_id":123,"owner_id":456,"event_time":1234567890}'
```

Expected:
- Response time: <500ms
- Response: `{"status":"EVENT_RECEIVED"}`
- Celery worker should log task queued

### 5.2 Verify Idempotency

```bash
# Run same webhook 3 times
for i in {1..3}; do
  curl -X POST http://localhost:8000/api/strava/webhook/ \
    -H "Content-Type: application/json" \
    -d '{"object_type":"activity","aspect_type":"create","object_id":123,"owner_id":456,"event_time":1234567890}'
  echo ""
done

# Check database
docker-compose exec backend python manage.py shell
```

```python
from strava_ingest.models import Activity
Activity.objects.filter(strava_id=123).count()
# Expected: 1 (not 3)
```

## Phase 6: Rate Limiting

### 6.1 Verify Rate Limit Tracking

```bash
docker-compose exec backend python manage.py shell
```

```python
from strava_ingest.strava_client import StravaRateLimiter

limiter = StravaRateLimiter()
print(f"Short limit: {limiter.short_limit}")
print(f"Daily limit: {limiter.daily_limit}")
# Expected: 100, 1000

# Test wait logic
limiter.short_usage = 95
limiter.short_reset = time.time() + 5
limiter.wait_if_needed()
# Should wait 5 seconds
```

### 6.2 Verify 429 Handling

The `strava_client.py` now explicitly catches 429 and raises with retry-after info.

## Phase 7: End-to-End Flow (Optional)

**Only if you have real Strava credentials**:

1. Configure `backend/.env` with real credentials
2. Visit http://localhost:3000
3. Click "Connect to Strava"
4. Authorize
5. Wait for sync
6. Verify:
   - Dashboard loads
   - Activities show stats
   - Maps show redacted routes only
   - No start/end locations visible
   - Footer shows privacy notice

## Success Criteria

✅ All tests pass (27+ tests)  
✅ Privacy tests pass (12 tests)  
✅ API never returns start/end latlng  
✅ API returns redacted polyline only  
✅ Services start without errors  
✅ Health checks return 200  
✅ Webhook responds <500ms  
✅ Footer shows privacy notice  
✅ Rate limiting handles 429  
✅ Idempotency confirmed  

## Quick Validation (5 min)

```bash
# 1. Start services
docker-compose up -d && sleep 30

# 2. Check health
curl http://localhost:8000/api/health/

# 3. Run privacy tests
docker-compose exec backend pytest strava_ingest/tests_privacy.py

# 4. Check frontend loads
curl -I http://localhost:3000

# All pass? You're good to go!
```

## Rollback Plan

If issues found:

```bash
# Stop services
docker-compose down

# Reset database
docker-compose down -v

# Check specific service logs
docker-compose logs [service-name]
```

## Notes

- Privacy tests can run without Strava credentials
- End-to-end flow requires real Strava API app
- All privacy features work independently of Strava Premium
- Redaction happens at ingestion time (performance optimized)
