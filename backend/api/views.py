import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from strava_ingest.models import Activity, StravaAthlete
from metrics.models import Milestone, DerivedWeekly
from .serializers import (
    ActivityListSerializer, 
    ActivityDetailSerializer,
    MilestoneSerializer,
    DerivedWeeklySerializer
)
from strava_ingest.tasks import incremental_sync

logger = logging.getLogger(__name__)


class ActivityPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for activities."""
    
    queryset = Activity.objects.select_related('athlete').prefetch_related('streams').filter(
        type__in=['Ride', 'VirtualRide', 'EBikeRide']
    )
    pagination_class = ActivityPagination
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ActivityDetailSerializer
        return ActivityListSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        activity_type = self.request.query_params.get('type')
        if activity_type:
            queryset = queryset.filter(type=activity_type)
        
        trainer = self.request.query_params.get('trainer')
        if trainer is not None:
            queryset = queryset.filter(trainer=trainer.lower() == 'true')
        
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(start_date__year=int(year))
        
        return queryset.order_by('-start_date')


class MilestoneViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for milestones."""
    
    queryset = Milestone.objects.select_related('athlete').all()
    serializer_class = MilestoneSerializer
    pagination_class = None


@api_view(['GET'])
def summary_view(request):
    """Aggregate summary statistics."""
    
    athlete = StravaAthlete.objects.first()
    if not athlete:
        return Response({'error': 'No athlete found'}, status=status.HTTP_404_NOT_FOUND)
    
    activities = Activity.objects.filter(
        athlete=athlete,
        type__in=['Ride', 'VirtualRide', 'EBikeRide']
    )
    
    now = timezone.now()
    
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    def aggregate_period(qs):
        indoor = qs.filter(Q(trainer=True) | Q(type='VirtualRide'))
        outdoor = qs.filter(trainer=False).exclude(type='VirtualRide')
        
        return {
            'total_rides': qs.count(),
            'total_distance_m': qs.aggregate(Sum('distance_m'))['distance_m__sum'] or 0,
            'total_time_s': qs.aggregate(Sum('moving_time_s'))['moving_time_s__sum'] or 0,
            'total_elevation_m': qs.aggregate(Sum('total_elevation_gain_m'))['total_elevation_gain_m__sum'] or 0,
            'total_kj': qs.aggregate(Sum('kilojoules'))['kilojoules__sum'] or 0,
            'indoor_rides': indoor.count(),
            'indoor_distance_m': indoor.aggregate(Sum('distance_m'))['distance_m__sum'] or 0,
            'outdoor_rides': outdoor.count(),
            'outdoor_distance_m': outdoor.aggregate(Sum('distance_m'))['distance_m__sum'] or 0,
        }
    
    summary = {
        'athlete': {
            'id': athlete.id,
            'name': f"{athlete.firstname} {athlete.lastname}",
            'strava_id': athlete.strava_id,
            'ftp': athlete.ftp,
        },
        'this_week': aggregate_period(activities.filter(start_date__gte=week_start)),
        'this_month': aggregate_period(activities.filter(start_date__gte=month_start)),
        'year_to_date': aggregate_period(activities.filter(start_date__gte=year_start)),
        'all_time': aggregate_period(activities),
    }
    
    return Response(summary)


@api_view(['GET'])
def weekly_trends(request):
    """Get weekly trend data for charts."""
    
    athlete = StravaAthlete.objects.first()
    if not athlete:
        return Response({'error': 'No athlete found'}, status=status.HTTP_404_NOT_FOUND)
    
    weeks_back = int(request.query_params.get('weeks', 12))
    
    weekly_data = DerivedWeekly.objects.filter(
        athlete=athlete
    ).order_by('-week_start_date')[:weeks_back]
    
    serializer = DerivedWeeklySerializer(weekly_data, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def admin_sync(request):
    """Manually trigger sync (admin only)."""
    
    auth_header = request.headers.get('Authorization', '')
    expected_token = f"Bearer {settings.ADMIN_API_TOKEN}"
    
    if not settings.ADMIN_API_TOKEN or auth_header != expected_token:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
    
    athlete_id = request.data.get('athlete_id')
    
    if athlete_id:
        athletes = StravaAthlete.objects.filter(id=athlete_id)
    else:
        athletes = StravaAthlete.objects.all()
    
    if not athletes.exists():
        return Response({'error': 'No athletes found'}, status=status.HTTP_404_NOT_FOUND)
    
    for athlete in athletes:
        incremental_sync.delay(athlete.id)
    
    return Response({
        'status': 'queued',
        'athletes': athletes.count()
    })
