#!/bin/bash

echo "🔍 Verifying Cycling Dashboard Project Structure"
echo "================================================"
echo ""

errors=0

check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
    else
        echo "❌ MISSING: $1"
        ((errors++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1/"
    else
        echo "❌ MISSING: $1/"
        ((errors++))
    fi
}

echo "📁 Root Configuration"
check_file "docker-compose.yml"
check_file "docker-compose.prod.yml"
check_file "setup.sh"
check_file "Makefile"
check_file ".gitignore"
check_file ".dockerignore"

echo ""
echo "📚 Documentation"
check_file "README.md"
check_file "QUICKSTART.md"
check_file "ARCHITECTURE.md"
check_file "DEPLOYMENT.md"
check_file "CONTRIBUTING.md"
check_file "TESTING.md"
check_file "PROJECT.md"
check_file "SUMMARY.md"
check_file "CHANGELOG.md"

echo ""
echo "🐍 Backend Structure"
check_dir "backend"
check_file "backend/requirements.txt"
check_file "backend/Dockerfile"
check_file "backend/.env.example"
check_file "backend/manage.py"
check_file "backend/pytest.ini"

echo ""
echo "🔧 Django Project"
check_dir "backend/cycling_dashboard"
check_file "backend/cycling_dashboard/settings.py"
check_file "backend/cycling_dashboard/urls.py"
check_file "backend/cycling_dashboard/celery.py"
check_file "backend/cycling_dashboard/celery_beat_schedule.py"

echo ""
echo "📦 Django Apps"
check_dir "backend/strava_ingest"
check_file "backend/strava_ingest/models.py"
check_file "backend/strava_ingest/strava_client.py"
check_file "backend/strava_ingest/oauth.py"
check_file "backend/strava_ingest/webhook.py"
check_file "backend/strava_ingest/ingest.py"
check_file "backend/strava_ingest/tasks.py"
check_file "backend/strava_ingest/tests.py"

check_dir "backend/metrics"
check_file "backend/metrics/models.py"
check_file "backend/metrics/compute.py"
check_file "backend/metrics/tasks.py"

check_dir "backend/api"
check_file "backend/api/views.py"
check_file "backend/api/serializers.py"
check_file "backend/api/urls.py"
check_file "backend/api/health.py"
check_file "backend/api/tests.py"

echo ""
echo "⚛️  Frontend Structure"
check_dir "frontend"
check_file "frontend/package.json"
check_file "frontend/tsconfig.json"
check_file "frontend/tailwind.config.ts"
check_file "frontend/next.config.js"
check_file "frontend/Dockerfile"
check_file "frontend/.env.example"

echo ""
echo "📄 Frontend Pages"
check_file "frontend/src/app/layout.tsx"
check_file "frontend/src/app/page.tsx"
check_file "frontend/src/app/globals.css"
check_file "frontend/src/app/activities/page.tsx"
check_file "frontend/src/app/activities/[id]/page.tsx"
check_file "frontend/src/app/auth/callback/page.tsx"

echo ""
echo "🧩 Frontend Components"
check_file "frontend/src/components/Header.tsx"
check_file "frontend/src/components/StatCard.tsx"
check_file "frontend/src/components/MilestoneCard.tsx"
check_file "frontend/src/components/WeeklyChart.tsx"
check_file "frontend/src/components/ActivityMap.tsx"

echo ""
echo "🔨 Frontend Utilities"
check_file "frontend/src/lib/api.ts"
check_file "frontend/src/lib/utils.ts"

echo ""
echo "================================================"
if [ $errors -eq 0 ]; then
    echo "✅ All files present! Project structure is complete."
    echo ""
    echo "Next steps:"
    echo "  1. Configure backend/.env with Strava credentials"
    echo "  2. Run: ./setup.sh"
    echo "  3. Visit: http://localhost:3000"
else
    echo "❌ Found $errors missing files"
    exit 1
fi
