import logging
from datetime import datetime, timedelta

from django.db.models import Sum, Q
from django.conf import settings
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, AllowAny

from strava_ingest.models import Activity, StravaAthlete
from metrics.models import Milestone, DerivedWeekly
from .serializers import (
    ActivityListSerializer,
    ActivityDetailSerializer,
    MilestoneSerializer,
    DerivedWeeklySerializer,
)
from strava_ingest.tasks import incremental_sync

logger = logging.getLogger(__name__)


class ActivityPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _get_athlete_and_data_start(request):
    """
    Resolve the StravaAthlete and optional data-start filter for the
    authenticated user.  Returns (athlete, data_start_dt | None).
    """
    profile = request.user.profile
    athlete = profile.strava_athlete
    data_start = None
    if profile.data_start_date:
        data_start = timezone.make_aware(
            datetime.combine(profile.data_start_date, datetime.min.time())
        )
    return athlete, data_start


class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """Activities for the authenticated user."""

    pagination_class = ActivityPagination

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ActivityDetailSerializer
        return ActivityListSerializer

    def get_queryset(self):
        athlete, data_start = _get_athlete_and_data_start(self.request)
        qs = Activity.objects.select_related('athlete').prefetch_related('streams').filter(
            athlete=athlete,
            type__in=['Ride', 'VirtualRide', 'EBikeRide'],
        )
        if data_start:
            qs = qs.filter(start_date__gte=data_start)

        activity_type = self.request.query_params.get('type')
        if activity_type:
            qs = qs.filter(type=activity_type)

        indoor = self.request.query_params.get('indoor')
        if indoor is not None:
            if indoor.lower() == 'true':
                qs = qs.filter(Q(trainer=True) | Q(type='VirtualRide'))
            else:
                qs = qs.filter(trainer=False).exclude(type='VirtualRide')

        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(start_date__year=int(year))

        return qs.order_by('-start_date')


class MilestoneViewSet(viewsets.ReadOnlyModelViewSet):
    """Milestones for the authenticated user."""

    serializer_class = MilestoneSerializer
    pagination_class = None

    def get_queryset(self):
        athlete, _ = _get_athlete_and_data_start(self.request)
        return Milestone.objects.select_related('athlete').filter(athlete=athlete)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def summary_view(request):
    """Aggregate summary statistics for the authenticated user."""
    athlete, data_start = _get_athlete_and_data_start(request)

    activities = Activity.objects.filter(
        athlete=athlete,
        type__in=['Ride', 'VirtualRide', 'EBikeRide'],
    )
    if data_start:
        activities = activities.filter(start_date__gte=data_start)

    now = timezone.now()
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
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

    profile = request.user.profile
    summary = {
        'athlete': {
            'id': athlete.id,
            'name': profile.display_name,
            'username': profile.username,
            'strava_id': athlete.strava_id,
            'ftp': athlete.ftp,
            'primary_bike_distance_m': athlete.primary_bike_distance_m,
            'avatar_url': profile.avatar_url,
        },
        'this_week': aggregate_period(activities.filter(start_date__gte=week_start)),
        'this_month': aggregate_period(activities.filter(start_date__gte=month_start)),
        'year_to_date': aggregate_period(activities.filter(start_date__gte=year_start)),
        'all_time': aggregate_period(activities),
    }
    return Response(summary)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weekly_trends(request):
    """Weekly trend data for the authenticated user."""
    athlete, data_start = _get_athlete_and_data_start(request)
    weeks_back = int(request.query_params.get('weeks', 12))

    qs = DerivedWeekly.objects.filter(athlete=athlete)
    if data_start:
        qs = qs.filter(week_start_date__gte=data_start)

    weekly_data = qs.order_by('-week_start_date')[:weeks_back]
    return Response(DerivedWeeklySerializer(weekly_data, many=True).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_sync(request):
    """Manually trigger sync (admin only)."""
    auth_header = request.headers.get('Authorization', '')
    expected_token = f"Bearer {settings.ADMIN_API_TOKEN}"

    if not settings.ADMIN_API_TOKEN or auth_header != expected_token:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    athlete_id = request.data.get('athlete_id')
    athletes = StravaAthlete.objects.filter(id=athlete_id) if athlete_id else StravaAthlete.objects.all()

    if not athletes.exists():
        return Response({'error': 'No athletes found'}, status=status.HTTP_404_NOT_FOUND)

    for athlete in athletes:
        incremental_sync.delay(athlete.id)

    return Response({'status': 'queued', 'athletes': athletes.count()})
