#!/bin/bash
set -e

echo "🔍 Cycling Dashboard - Quick Validation"
echo "========================================"
echo ""

cd "$(dirname "$0")"

echo "1️⃣  Python syntax check..."
python3 -m py_compile backend/strava_ingest/privacy.py
python3 -m py_compile backend/strava_ingest/ingest.py
python3 -m py_compile backend/api/serializers.py
echo "   ✅ Python syntax valid"
echo ""

echo "2️⃣  File structure check..."
./verify.sh > /dev/null 2>&1 && echo "   ✅ All files present" || echo "   ❌ Missing files"
echo ""

echo "3️⃣  Docker Compose check..."
if docker-compose config > /dev/null 2>&1; then
    echo "   ✅ docker-compose.yml valid"
else
    echo "   ❌ docker-compose.yml has errors"
fi
echo ""

echo "4️⃣  Privacy module test..."
python3 -c "import sys; sys.path.insert(0, 'backend'); from strava_ingest.privacy import redact_polyline; print('   ✅ Privacy module imports')" || echo "   ❌ Import failed"
echo ""

echo "✅ Quick validation complete!"
echo ""
echo "Next steps:"
echo "  • Run full tests: docker-compose exec backend pytest"
echo "  • Start services: docker-compose up -d"
echo "  • Configure: backend/.env with Strava credentials"
