import logging
from celery import shared_task
from django.db import transaction
from .models import StravaAthlete, Activity
from .strava_client import StravaClient
from .ingest import sync_athlete_activities, save_activity_from_strava, sync_athlete_profile
from metrics.tasks import compute_metrics_for_athlete

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def backfill_activities(self, athlete_id, days=365):
    """
    Backfill activities for an athlete.
    
    Args:
        athlete_id: Primary key of StravaAthlete
        days: Number of days to look back
    """
    try:
        athlete = StravaAthlete.objects.get(id=athlete_id)
        logger.info(f"Starting backfill for athlete {athlete.strava_id}, last {days} days")
        
        result = sync_athlete_activities(athlete, days=days, page_limit=20)
        
        compute_metrics_for_athlete.delay(athlete_id)
        
        return result
    
    except Exception as exc:
        logger.exception(f"Backfill failed for athlete {athlete_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def incremental_sync(self, athlete_id):
    """
    Incrementally sync recent activities.
    
    Args:
        athlete_id: Primary key of StravaAthlete
    """
    try:
        athlete = StravaAthlete.objects.get(id=athlete_id)
        logger.info(f"Starting incremental sync for athlete {athlete.strava_id}")

        sync_athlete_profile(athlete)

        result = sync_athlete_activities(athlete, days=7, page_limit=5)
        
        compute_metrics_for_athlete.delay(athlete_id)
        
        return result
    
    except Exception as exc:
        logger.exception(f"Incremental sync failed for athlete {athlete_id}: {exc}")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=5, default_retry_delay=30)
def process_webhook_event(self, object_type, aspect_type, object_id, owner_id, event_time):
    """
    Process webhook event from Strava.
    
    Args:
        object_type: 'activity', 'athlete'
        aspect_type: 'create', 'update', 'delete'
        object_id: ID of the object
        owner_id: Strava athlete ID
        event_time: Unix timestamp of event
    """
    try:
        logger.info(f"Processing webhook: {aspect_type} {object_type} {object_id} for athlete {owner_id}")
        
        if object_type != 'activity':
            logger.info(f"Ignoring non-activity event: {object_type}")
            return {'status': 'ignored', 'reason': 'not_activity'}
        
        if aspect_type == 'delete':
            deleted_count, _ = Activity.objects.filter(strava_id=object_id).delete()
            logger.info(f"Deleted activity {object_id}: {deleted_count} rows")
            return {'status': 'deleted', 'activity_id': object_id}
        
        athlete = StravaAthlete.objects.filter(strava_id=owner_id).first()
        if not athlete:
            logger.warning(f"Athlete {owner_id} not found, skipping webhook event")
            return {'status': 'skipped', 'reason': 'athlete_not_found'}
        
        client = StravaClient(token_model=athlete.oauth_token)
        activity_data = client.get_activity(object_id)
        
        activity, created = save_activity_from_strava(
            athlete, 
            activity_data, 
            fetch_streams=False
        )
        
        compute_metrics_for_athlete.delay(athlete.id)
        
        return {
            'status': 'processed',
            'activity_id': object_id,
            'created': created
        }
    
    except Exception as exc:
        logger.exception(f"Webhook processing failed: {exc}")
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 30)


@shared_task
def scheduled_incremental_sync():
    """Periodic task to sync all athletes (fallback to webhooks)."""
    logger.info("Running scheduled incremental sync for all athletes")
    
    athletes = StravaAthlete.objects.all()
    for athlete in athletes:
        incremental_sync.delay(athlete.id)
    
    return {'athletes_synced': athletes.count()}
