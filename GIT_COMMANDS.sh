#!/bin/bash
# Commands to initialize Git and push to GitHub

set -e

cd "$(dirname "$0")"

echo "🔧 Initializing Git repository..."
git init

echo "📝 Adding all files..."
git add .

echo "💾 Creating initial commit..."
git commit -m "Initial commit: Cycling Dashboard MVP with privacy protections

- Django + DRF backend with Strava integration
- Next.js + Tailwind frontend with interactive dashboard
- Celery async processing with Redis
- Privacy-protected route rendering (redacted polylines)
- Docker Compose for local development
- Railway deployment ready
- Comprehensive documentation (13 guides)
- 27+ tests including privacy protection tests"

echo "🚀 Creating GitHub repository and pushing..."
echo ""
echo "Checking if gh CLI is installed..."

if command -v gh &> /dev/null; then
    echo "✅ gh CLI found, creating repository..."
    
    gh repo create JamesSamPotter \
        --public \
        --source=. \
        --remote=origin \
        --push \
        --description "Personal cycling analytics dashboard with Strava integration and privacy-protected route visualization"
    
    echo ""
    echo "✅ Repository created and pushed!"
    echo ""
    echo "🔗 Repository URL: https://github.com/$(gh api user --jq .login)/JamesSamPotter"
    echo ""
else
    echo "⚠️  gh CLI not found. Manual steps:"
    echo ""
    echo "1. Go to https://github.com/new"
    echo "2. Repository name: JamesSamPotter"
    echo "3. Description: Personal cycling analytics dashboard"
    echo "4. Public repository"
    echo "5. Don't initialize with README (we have one)"
    echo "6. Create repository"
    echo ""
    echo "7. Then run these commands:"
    echo ""
    echo "   git remote add origin git@github.com:YOUR_USERNAME/JamesSamPotter.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    echo "Or with HTTPS:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/JamesSamPotter.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    
    exit 1
fi

echo "📋 Next steps:"
echo "1. Go to Railway: https://railway.app/new"
echo "2. Select 'Deploy from GitHub repo'"
echo "3. Choose 'JamesSamPotter'"
echo "4. Follow DEPLOY_RAILWAY.md for service setup"
echo ""
echo "📖 See DEPLOY_RAILWAY.md for complete deployment guide"
