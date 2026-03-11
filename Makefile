.PHONY: help setup up down logs shell migrate test clean

help:
	@echo "Cycling Dashboard - Available Commands"
	@echo "======================================="
	@echo "make setup      - Initial setup (first time only)"
	@echo "make up         - Start all services"
	@echo "make down       - Stop all services"
	@echo "make logs       - View logs (all services)"
	@echo "make shell      - Open Django shell"
	@echo "make migrate    - Run database migrations"
	@echo "make test       - Run backend tests"
	@echo "make sync       - Manually sync Strava activities"
	@echo "make metrics    - Recompute metrics"
	@echo "make clean      - Stop and remove all containers + volumes"

setup:
	chmod +x setup.sh
	./setup.sh

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

shell:
	docker-compose exec backend python manage.py shell

migrate:
	docker-compose exec backend python manage.py migrate

test:
	docker-compose exec backend pytest

sync:
	docker-compose exec backend python manage.py strava_sync --days 7

metrics:
	docker-compose exec backend python manage.py compute_metrics

clean:
	docker-compose down -v
	rm -rf backend/__pycache__
	rm -rf backend/*/__pycache__
	rm -rf frontend/.next
	rm -rf frontend/node_modules
