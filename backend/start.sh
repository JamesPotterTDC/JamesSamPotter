#!/bin/bash
set -e

echo "=== Starting Django Application ==="
echo "Step 1: Running migrations..."
python manage.py migrate --skip-checks
echo "✓ Migrations complete"

echo "Step 2: Collecting static files..."
python manage.py collectstatic --noinput --skip-checks
echo "✓ Static files collected"

echo "Step 3: Starting Gunicorn..."
exec gunicorn cycling_dashboard.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --access-logfile - --error-logfile -
