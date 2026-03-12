#!/bin/bash
set -e

SERVICE_TYPE=${SERVICE_TYPE:-web}

echo "=== Starting Service: $SERVICE_TYPE ==="

if [ "$SERVICE_TYPE" = "web" ]; then
    echo "Step 1: Running migrations..."
    python manage.py migrate --skip-checks
    echo "✓ Migrations complete"

    echo "Step 2: Collecting static files..."
    python manage.py collectstatic --noinput --skip-checks
    echo "✓ Static files collected"

    echo "Step 3: Starting Gunicorn..."
    exec gunicorn cycling_dashboard.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --access-logfile - --error-logfile -

elif [ "$SERVICE_TYPE" = "worker" ]; then
    echo "Starting Celery Worker..."
    exec celery -A cycling_dashboard worker --loglevel=info --concurrency=2

elif [ "$SERVICE_TYPE" = "beat" ]; then
    echo "Starting Celery Beat..."
    exec celery -A cycling_dashboard beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

else
    echo "ERROR: Unknown SERVICE_TYPE: $SERVICE_TYPE"
    echo "Must be one of: web, worker, beat"
    exit 1
fi
