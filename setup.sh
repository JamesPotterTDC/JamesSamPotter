#!/bin/bash
set -e

echo "🚴 Cycling Dashboard Setup"
echo "=========================="
echo ""

echo "📝 Creating environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✓ Created backend/.env (please configure with your Strava credentials)"
else
    echo "✓ backend/.env already exists"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✓ Created frontend/.env"
else
    echo "✓ frontend/.env already exists"
fi

echo ""
echo "🔑 Generating encryption key..."
docker-compose run --rm backend python scripts/generate_encryption_key.py

echo ""
echo "🐳 Building and starting services..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "🗄️  Running database migrations..."
docker-compose exec -T backend python manage.py migrate

echo ""
echo "👤 Creating superuser (optional, skip if desired)..."
echo "You can create one later with: docker-compose exec backend python manage.py createsuperuser"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000/api"
echo "   Django Admin: http://localhost:8000/admin"
echo ""
echo "📋 Next steps:"
echo "   1. Configure Strava API credentials in backend/.env"
echo "   2. Add ENCRYPTION_KEY to backend/.env (generated above)"
echo "   3. Restart services: docker-compose restart"
echo "   4. Visit http://localhost:3000 and connect to Strava"
echo ""
echo "For webhook setup (optional), see README.md"
