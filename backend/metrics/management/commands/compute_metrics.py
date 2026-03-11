import logging
from django.core.management.base import BaseCommand
from strava_ingest.models import StravaAthlete
from metrics.compute import compute_weekly_metrics, compute_milestones

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Compute metrics for all athletes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--athlete-id',
            type=int,
            help='Compute metrics for specific athlete by ID'
        )

    def handle(self, *args, **options):
        athlete_id = options.get('athlete_id')
        
        if athlete_id:
            athletes = StravaAthlete.objects.filter(id=athlete_id)
        else:
            athletes = StravaAthlete.objects.all()
        
        if not athletes.exists():
            self.stdout.write(self.style.WARNING('No athletes found'))
            return
        
        for athlete in athletes:
            self.stdout.write(f"Computing metrics for {athlete.strava_id}")
            
            try:
                compute_weekly_metrics(athlete)
                compute_milestones(athlete)
                self.stdout.write(self.style.SUCCESS(f"  ✓ Metrics computed"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ Failed: {e}"))
                logger.exception(f"Metrics computation failed for athlete {athlete.id}")
        
        self.stdout.write(self.style.SUCCESS('Done'))
