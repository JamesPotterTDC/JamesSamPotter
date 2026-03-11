# 🚴 Cycling Dashboard - START HERE

Welcome to your personal cycling analytics dashboard!

## What Is This?

A complete, production-ready web application that:
- 📥 Syncs all your Strava cycling activities automatically
- 📊 Shows beautiful stats, charts, and maps
- 🏆 Tracks milestones and achievements
- ⚡ Updates in real-time via webhooks

## Quick Start (10 minutes)

1. **Get Strava credentials**: https://www.strava.com/settings/api
2. **Configure**: Copy credentials to `backend/.env`
3. **Run**: `./setup.sh`
4. **Open**: http://localhost:3000
5. **Connect**: Click "Connect to Strava"

**Detailed guide**: See [GETTING_STARTED.md](GETTING_STARTED.md)

## Documentation Map

### For New Users

1. **[GETTING_STARTED.md](GETTING_STARTED.md)** ← Start here for step-by-step setup
2. **[QUICKSTART.md](QUICKSTART.md)** - Condensed 10-minute guide
3. **[README.md](README.md)** - Main documentation

### For Developers

1. **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development setup and guidelines
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical deep dive
3. **[TESTING.md](TESTING.md)** - Testing strategy and execution

### For Deployment

1. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
2. **[STATUS.md](STATUS.md)** - Current project status
3. **[CHANGELOG.md](CHANGELOG.md)** - Version history

### Reference

1. **[PROJECT.md](PROJECT.md)** - File structure and features
2. **[SUMMARY.md](SUMMARY.md)** - Build summary and metrics

## What You Get

### Dashboard Features

- **Year-to-date stats**: Distance, time, elevation, energy
- **Weekly summary**: This week's rides and progress
- **Indoor/Outdoor split**: Trainer vs outdoor riding
- **12-week trend chart**: Visual progress over time
- **Milestones**: Everest challenge, current streak, longest ride
- **Activity list**: All rides with filters and pagination
- **Activity detail**: Maps, full stats, power/HR data

### Technical Stack

- **Backend**: Django + Django REST Framework + Celery
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Database**: PostgreSQL
- **Queue**: Redis + Celery
- **Charts**: Recharts
- **Maps**: MapLibre GL
- **Container**: Docker Compose

### What Makes It Production-Ready

✅ Encrypted token storage  
✅ Automatic sync (hourly + webhooks)  
✅ Rate limit handling  
✅ Retry logic with backoff  
✅ Comprehensive logging  
✅ Health checks  
✅ Idempotent operations  
✅ Test coverage  
✅ Complete documentation  

## File Structure

```
📁 jamessampotter.co.uk/
│
├── 📚 Documentation (10 guides)
│   ├── START_HERE.md ← You are here
│   ├── GETTING_STARTED.md
│   ├── README.md
│   └── ... 7 more guides
│
├── 🐍 backend/ (Django + Celery)
│   ├── cycling_dashboard/ (Django project)
│   ├── strava_ingest/ (OAuth + webhooks + sync)
│   ├── metrics/ (Analytics computation)
│   ├── api/ (REST endpoints)
│   └── requirements.txt
│
├── ⚛️  frontend/ (Next.js + TypeScript)
│   ├── src/app/ (Pages - 4 routes)
│   ├── src/components/ (5 components)
│   ├── src/lib/ (API client + utils)
│   └── package.json
│
└── 🐳 Infrastructure
    ├── docker-compose.yml (local dev)
    ├── docker-compose.prod.yml (production)
    └── setup.sh (automated setup)
```

## Quick Reference

### Common Commands

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Sync activities manually
docker-compose exec backend python manage.py strava_sync --days 7

# Access Django admin
open http://localhost:8000/admin

# Run tests
docker-compose exec backend pytest
```

### URLs

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:8000/api
- **Admin**: http://localhost:8000/admin
- **API Docs**: http://localhost:8000/api/ (DRF browsable API)

### Key Files to Configure

1. `backend/.env` - Strava credentials (REQUIRED)
2. `frontend/.env` - API URL (defaults OK for local)

## Troubleshooting

**"No athlete found"** → Initial sync still running, wait 5-10 min

**Can't connect to Strava** → Check credentials in `backend/.env`

**Docker errors** → Run `docker-compose down -v && docker-compose up -d --build`

**More help**: See [TESTING.md](TESTING.md) troubleshooting section

## Support

- 📖 Read [GETTING_STARTED.md](GETTING_STARTED.md) for detailed setup
- 🏗️ Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand how it works
- 🚀 Read [DEPLOYMENT.md](DEPLOYMENT.md) to deploy to production
- 💻 Read [CONTRIBUTING.md](CONTRIBUTING.md) to customize and extend

## Project Stats

- **Total Files**: 72 (62 source + 10 docs)
- **Lines of Code**: ~7,000+ (including tests and docs)
- **Backend Files**: 34 Python files
- **Frontend Files**: 13 TypeScript files
- **Tests**: 15+ test cases
- **API Endpoints**: 10
- **Docker Services**: 6
- **Documentation**: 10 comprehensive guides

## What's Not Included (Intentional)

These are out of scope for MVP but can be added:

- Multi-user support (single athlete only)
- User authentication (personal dashboard)
- Dark mode (light mode only)
- Advanced stream charts (data available, not fully visualized)
- Mobile app (web is responsive)
- Training plans
- Social features

## License

MIT License - See [LICENSE](LICENSE)

## Ready to Get Started?

→ **[Open GETTING_STARTED.md](GETTING_STARTED.md)** for step-by-step instructions

→ **[Run ./setup.sh](setup.sh)** if you just want to get started quickly

Happy cycling! 🚴‍♂️
