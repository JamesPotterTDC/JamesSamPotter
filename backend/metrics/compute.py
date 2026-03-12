import logging
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Avg, Max, Q
from django.utils import timezone
from .models import DerivedWeekly, Milestone
from strava_ingest.models import Activity

logger = logging.getLogger(__name__)


def get_week_start(date):
    """Get Monday of the week containing the given date."""
    return date - timedelta(days=date.weekday())


def compute_weekly_metrics(athlete):
    """Compute and store weekly aggregates for an athlete."""
    activities = Activity.objects.filter(
        athlete=athlete,
        type__in=['Ride', 'VirtualRide', 'EBikeRide']
    )
    
    if not activities.exists():
        logger.info(f"No cycling activities for athlete {athlete.strava_id}")
        return
    
    earliest = activities.order_by('start_date').first().start_date.date()
    latest = activities.order_by('-start_date').first().start_date.date()
    
    current_week = get_week_start(earliest)
    end_week = get_week_start(latest)
    
    weeks_computed = 0
    
    while current_week <= end_week:
        week_end = current_week + timedelta(days=7)
        
        week_activities = activities.filter(
            start_date__gte=current_week,
            start_date__lt=week_end
        )
        
        indoor = week_activities.filter(Q(trainer=True) | Q(type='VirtualRide'))
        outdoor = week_activities.filter(trainer=False).exclude(type='VirtualRide')
        
        totals = {
            'total_rides': week_activities.count(),
            'total_distance_m': week_activities.aggregate(Sum('distance_m'))['distance_m__sum'] or 0,
            'total_time_s': week_activities.aggregate(Sum('moving_time_s'))['moving_time_s__sum'] or 0,
            'total_elevation_m': week_activities.aggregate(Sum('total_elevation_gain_m'))['total_elevation_gain_m__sum'] or 0,
            'total_kj': week_activities.aggregate(Sum('kilojoules'))['kilojoules__sum'] or 0,
            'indoor_rides': indoor.count(),
            'indoor_distance_m': indoor.aggregate(Sum('distance_m'))['distance_m__sum'] or 0,
            'indoor_time_s': indoor.aggregate(Sum('moving_time_s'))['moving_time_s__sum'] or 0,
            'outdoor_rides': outdoor.count(),
            'outdoor_distance_m': outdoor.aggregate(Sum('distance_m'))['distance_m__sum'] or 0,
            'outdoor_time_s': outdoor.aggregate(Sum('moving_time_s'))['moving_time_s__sum'] or 0,
            'avg_watts': week_activities.aggregate(Avg('average_watts'))['average_watts__avg'],
            'avg_heartrate': week_activities.aggregate(Avg('average_heartrate'))['average_heartrate__avg'],
        }
        
        DerivedWeekly.objects.update_or_create(
            athlete=athlete,
            week_start_date=current_week,
            defaults={'totals_json': totals}
        )
        
        weeks_computed += 1
        current_week = week_end
    
    logger.info(f"Computed {weeks_computed} weeks of metrics for athlete {athlete.strava_id}")
    return weeks_computed


def compute_milestones(athlete):
    """Compute and update milestones for an athlete."""
    activities = Activity.objects.filter(
        athlete=athlete,
        type__in=['Ride', 'VirtualRide', 'EBikeRide']
    )
    
    if not activities.exists():
        return
    
    now = timezone.now()
    current_year = now.year
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    ytd_activities = activities.filter(start_date__year=current_year)
    month_activities = activities.filter(start_date__gte=current_month_start)
    
    ytd_elevation = ytd_activities.aggregate(Sum('total_elevation_gain_m'))['total_elevation_gain_m__sum'] or 0
    month_elevation = month_activities.aggregate(Sum('total_elevation_gain_m'))['total_elevation_gain_m__sum'] or 0
    
    EVEREST_HEIGHT = 8849
    
    Milestone.objects.update_or_create(
        athlete=athlete,
        key='everest_ytd',
        defaults={
            'title': f'Everest Challenge {current_year}',
            'payload': {
                'current_elevation_m': ytd_elevation,
                'target_elevation_m': EVEREST_HEIGHT,
                'progress_percent': (ytd_elevation / EVEREST_HEIGHT * 100) if EVEREST_HEIGHT else 0,
            },
            'achieved_at': now if ytd_elevation >= EVEREST_HEIGHT else None,
        }
    )
    
    Milestone.objects.update_or_create(
        athlete=athlete,
        key='everest_month',
        defaults={
            'title': f'Monthly Everest {now.strftime("%B %Y")}',
            'payload': {
                'current_elevation_m': month_elevation,
                'target_elevation_m': EVEREST_HEIGHT,
                'progress_percent': (month_elevation / EVEREST_HEIGHT * 100) if EVEREST_HEIGHT else 0,
            },
            'achieved_at': now if month_elevation >= EVEREST_HEIGHT else None,
        }
    )
    
    recent_activities = activities.order_by('-start_date')[:30]
    consecutive_days = 0
    last_date = None
    
    for activity in recent_activities:
        activity_date = activity.start_date.date()
        if last_date is None:
            consecutive_days = 1
            last_date = activity_date
        elif (last_date - activity_date).days == 1:
            consecutive_days += 1
            last_date = activity_date
        else:
            break
    
    Milestone.objects.update_or_create(
        athlete=athlete,
        key='current_streak',
        defaults={
            'title': 'Current Streak',
            'payload': {
                'days': consecutive_days,
                'last_activity_date': last_date.isoformat() if last_date else None,
            },
            'achieved_at': None,
        }
    )
    
    longest_ride = activities.order_by('-distance_m').first()
    if longest_ride:
        Milestone.objects.update_or_create(
            athlete=athlete,
            key='longest_ride',
            defaults={
                'title': 'Longest Ride',
                'payload': {
                    'distance_m': longest_ride.distance_m,
                    'activity_id': longest_ride.strava_id,
                    'activity_name': longest_ride.name,
                    'date': longest_ride.start_date.isoformat(),
                },
                'achieved_at': longest_ride.start_date,
            }
        )
    
    logger.info(f"Computed milestones for athlete {athlete.strava_id}")
