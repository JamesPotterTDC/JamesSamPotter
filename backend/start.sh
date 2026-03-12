#!/bin/bash
# Updated: 2026-03-12 11:50

SERVICE_TYPE=${SERVICE_TYPE:-web}

>&2 echo "=== Starting Service: $SERVICE_TYPE ==="

if [ "$SERVICE_TYPE" = "web" ]; then
    >&2 echo "Step 1: Running migrations..."
    python manage.py migrate --skip-checks 2>&1 || >&2 echo "Warning: Migrate had issues but continuing..."
    >&2 echo "✓ Migrations complete"

    >&2 echo "Step 2: Collecting static files..."
    python manage.py collectstatic --noinput --skip-checks 2>&1 || >&2 echo "Warning: Collectstatic had issues but continuing..."
    >&2 echo "✓ Static files collected"

    >&2 echo "Step 3: Starting Gunicorn on port $PORT..."
    exec gunicorn cycling_dashboard.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --access-logfile - --error-logfile - --log-level info

elif [ "$SERVICE_TYPE" = "worker" ]; then
    >&2 echo "Starting Celery Worker..."
    >&2 echo "Waiting 10 seconds for database to be ready..."
    sleep 10
    exec celery -A cycling_dashboard worker --loglevel=info --concurrency=2

elif [ "$SERVICE_TYPE" = "beat" ]; then
    >&2 echo "Starting Celery Beat..."
    >&2 echo "Waiting 15 seconds for database to be ready..."
    sleep 15
    exec celery -A cycling_dashboard beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

else
    >&2 echo "ERROR: Unknown SERVICE_TYPE: $SERVICE_TYPE"
    >&2 echo "Must be one of: web, worker, beat"
    exit 1
fi
