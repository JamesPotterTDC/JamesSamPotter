import logging
from django.core.management.base import BaseCommand
from strava_ingest.models import StravaAthlete
from strava_ingest.ingest import sync_athlete_activities

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync Strava activities for all athletes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=365,
            help='Number of days to look back (default: 365)'
        )
        parser.add_argument(
            '--athlete-id',
            type=int,
            help='Sync specific athlete by ID'
        )

    def handle(self, *args, **options):
        days = options['days']
        athlete_id = options.get('athlete_id')
        
        if athlete_id:
            athletes = StravaAthlete.objects.filter(id=athlete_id)
        else:
            athletes = StravaAthlete.objects.all()
        
        if not athletes.exists():
            self.stdout.write(self.style.WARNING('No athletes found'))
            return
        
        for athlete in athletes:
            self.stdout.write(f"Syncing athlete {athlete.strava_id} ({athlete.firstname} {athlete.lastname})")
            
            try:
                result = sync_athlete_activities(athlete, days=days, page_limit=50)
                self.stdout.write(self.style.SUCCESS(
                    f"  ✓ Fetched {result['total_fetched']} activities, {result['new_count']} new"
                ))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ Failed: {e}"))
                logger.exception(f"Sync failed for athlete {athlete.id}")
        
        self.stdout.write(self.style.SUCCESS('Sync complete'))
