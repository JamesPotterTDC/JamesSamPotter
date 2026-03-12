import logging
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from .models import Activity, ActivityStream, StravaAthlete, SyncMetadata
from .strava_client import StravaClient
from .privacy import redact_polyline, should_fetch_streams, get_redact_percent

logger = logging.getLogger(__name__)


def save_activity_from_strava(athlete, activity_data, fetch_streams=None):
    """
    Save or update activity from Strava API response.
    Idempotent by strava_id.
    
    Privacy protection:
    - Redacts polyline start/end segments
    - Never stores latlng streams unless explicitly enabled
    - Stores start/end latlng but NEVER exposes via API
    """
    if fetch_streams is None:
        fetch_streams = should_fetch_streams()
    
    strava_id = activity_data['id']
    
    map_data = activity_data.get('map', {})
    summary_polyline = map_data.get('summary_polyline', '')
    
    redact_percent = get_redact_percent()
    redacted_polyline = redact_polyline(summary_polyline, redact_percent=redact_percent)
    
    with transaction.atomic():
        activity, created = Activity.objects.update_or_create(
            strava_id=strava_id,
            defaults={
                'athlete': athlete,
                'name': activity_data.get('name', ''),
                'type': activity_data.get('type', ''),
                'sport_type': activity_data.get('sport_type', ''),
                'start_date': datetime.fromisoformat(activity_data['start_date'].replace('Z', '+00:00')),
                'timezone': activity_data.get('timezone', ''),
                'trainer': activity_data.get('trainer', False),
                'commute': activity_data.get('commute', False),
                'distance_m': activity_data.get('distance'),
                'moving_time_s': activity_data.get('moving_time'),
                'elapsed_time_s': activity_data.get('elapsed_time'),
                'total_elevation_gain_m': activity_data.get('total_elevation_gain'),
                'average_speed_mps': activity_data.get('average_speed'),
                'max_speed_mps': activity_data.get('max_speed'),
                'average_watts': activity_data.get('average_watts'),
                'weighted_average_watts': activity_data.get('weighted_average_watts'),
                'kilojoules': activity_data.get('kilojoules'),
                'average_heartrate': activity_data.get('average_heartrate'),
                'max_heartrate': activity_data.get('max_heartrate'),
                'average_cadence': activity_data.get('average_cadence'),
                'map_polyline_summary': summary_polyline,
                'map_polyline_redacted': redacted_polyline,
                'start_latlng': None,
                'end_latlng': None,
                'raw_json': activity_data,
            }
        )
        
        action = "Created" if created else "Updated"
        logger.info(f"{action} activity {strava_id}: {activity.name} (trainer={activity.trainer})")
        
        if fetch_streams and not hasattr(activity, 'streams'):
            try:
                client = StravaClient(token_model=athlete.oauth_token)
                streams_data = client.get_activity_streams(strava_id)
                
                if 'latlng' in streams_data:
                    logger.warning(f"Removing latlng stream for privacy (activity {strava_id})")
                    del streams_data['latlng']
                
                ActivityStream.objects.update_or_create(
                    activity=activity,
                    defaults={'streams_json': streams_data}
                )
                logger.info(f"Saved streams for activity {strava_id}")
            except Exception as e:
                logger.warning(f"Failed to fetch streams for {strava_id}: {e}")
        
        return activity, created


def sync_athlete_profile(athlete):
    """
    Refresh FTP and primary bike distance from the Strava athlete profile.
    Safe to call on every sync cycle — only updates changed fields.
    """
    client = StravaClient(token_model=athlete.oauth_token)
    try:
        profile = client.get_athlete()
        update_fields = []
        ftp = profile.get('ftp')
        if ftp and athlete.ftp != int(ftp):
            athlete.ftp = int(ftp)
            update_fields.append('ftp')
        bikes = profile.get('bikes') or []
        primary = next((b for b in bikes if b.get('primary')), bikes[0] if bikes else None)
        if primary and primary.get('distance'):
            dist = float(primary['distance'])
            if athlete.primary_bike_distance_m != dist:
                athlete.primary_bike_distance_m = dist
                update_fields.append('primary_bike_distance_m')
        if update_fields:
            athlete.save(update_fields=update_fields)
            logger.info(f"Updated athlete profile fields {update_fields} for {athlete.strava_id}")
    except Exception as e:
        logger.warning(f"Could not sync athlete profile for {athlete.strava_id}: {e}")


def sync_athlete_activities(athlete, days=None, page_limit=10):
    """
    Sync activities for an athlete.
    
    Args:
        athlete: StravaAthlete instance
        days: Number of days to look back (None = all, use with care)
        page_limit: Maximum pages to fetch (safety limit)
    """
    client = StravaClient(token_model=athlete.oauth_token)
    
    sync_meta, _ = SyncMetadata.objects.get_or_create(athlete=athlete)
    sync_meta.last_sync_started_at = timezone.now()
    sync_meta.last_sync_status = 'running'
    sync_meta.save()
    
    try:
        after = None
        if days:
            after = timezone.now() - timezone.timedelta(days=days)
        elif sync_meta.last_activity_date:
            after = sync_meta.last_activity_date - timezone.timedelta(days=1)
        
        page = 1
        total_fetched = 0
        new_count = 0
        
        while page <= page_limit:
            logger.info(f"Fetching page {page} for athlete {athlete.strava_id}")
            
            activities = client.get_activities(page=page, per_page=50, after=after)
            
            if not activities:
                logger.info("No more activities to fetch")
                break
            
            for activity_data in activities:
                activity, created = save_activity_from_strava(
                    athlete, 
                    activity_data, 
                    fetch_streams=False
                )
                if created:
                    new_count += 1
            
            total_fetched += len(activities)
            
            if len(activities) < 50:
                break
            
            page += 1
        
        latest_activity = Activity.objects.filter(athlete=athlete).order_by('-start_date').first()
        if latest_activity:
            sync_meta.last_activity_date = latest_activity.start_date
        
        sync_meta.last_sync_completed_at = timezone.now()
        sync_meta.last_sync_status = 'success'
        sync_meta.save()
        
        logger.info(f"Sync complete: {total_fetched} activities fetched, {new_count} new")
        
        return {
            'total_fetched': total_fetched,
            'new_count': new_count,
            'status': 'success'
        }
    
    except Exception as e:
        logger.exception(f"Sync failed for athlete {athlete.strava_id}: {e}")
        sync_meta.last_sync_status = 'failed'
        sync_meta.save()
        raise
