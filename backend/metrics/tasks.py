import logging
from celery import shared_task
from strava_ingest.models import StravaAthlete
from .compute import compute_weekly_metrics, compute_milestones

logger = logging.getLogger(__name__)


@shared_task
def compute_metrics_for_athlete(athlete_id):
    """Compute all metrics for an athlete."""
    try:
        athlete = StravaAthlete.objects.get(id=athlete_id)
        logger.info(f"Computing metrics for athlete {athlete.strava_id}")
        
        compute_weekly_metrics(athlete)
        compute_milestones(athlete)
        
        logger.info(f"Metrics computation complete for athlete {athlete.strava_id}")
        return {'status': 'success', 'athlete_id': athlete_id}
    
    except Exception as e:
        logger.exception(f"Metrics computation failed for athlete {athlete_id}: {e}")
        raise


@shared_task
def compute_all_metrics():
    """Compute metrics for all athletes."""
    athletes = StravaAthlete.objects.all()
    
    for athlete in athletes:
        compute_metrics_for_athlete.delay(athlete.id)
    
    logger.info(f"Queued metrics computation for {athletes.count()} athletes")
    return {'athletes': athletes.count()}
