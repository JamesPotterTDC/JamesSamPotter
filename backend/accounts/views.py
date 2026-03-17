import logging
from datetime import datetime, timedelta, date

from django.db.models import Q, Sum
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from strava_ingest.models import Activity, StravaAthlete
from metrics.models import Milestone, DerivedWeekly
from api.serializers import (
    ActivityListSerializer,
    ActivityDetailSerializer,
    MilestoneSerializer,
    DerivedWeeklySerializer,
)
from .models import UserProfile, FriendRequest, Friendship, can_view_profile, are_friends
from .serializers import (
    PublicProfileSerializer,
    MeSerializer,
    UpdateProfileSerializer,
    FriendRequestSerializer,
)

logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_viewer_profile(request):
    """Return the UserProfile for the authenticated user, or None."""
    if request.user and request.user.is_authenticated:
        try:
            return request.user.profile
        except Exception:
            pass
    return None


def _data_start_filter(profile):
    """Return a datetime (aware) from which to start showing data, or None."""
    if profile and profile.data_start_date:
        return timezone.make_aware(datetime.combine(profile.data_start_date, datetime.min.time()))
    return None


def _resolve_viewable_athlete(request, username):
    """
    Look up a UserProfile by username and check if the request's user can view it.
    Returns (profile, athlete, error_response).
    On success error_response is None; on failure profile/athlete are None.
    """
    try:
        profile = UserProfile.objects.select_related('strava_athlete').get(username=username)
    except UserProfile.DoesNotExist:
        return None, None, Response({'error': 'User not found'}, status=404)

    viewer = _get_viewer_profile(request)
    if not can_view_profile(viewer, profile):
        if viewer is None:
            return None, None, Response(
                {'error': 'This profile is private. Log in to request access.'},
                status=401,
            )
        return None, None, Response({'error': 'This profile is private.'}, status=403)

    if not profile.strava_athlete:
        return None, None, Response({'error': 'No Strava data for this user.'}, status=404)

    return profile, profile.strava_athlete, None


def _aggregate_period(qs):
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


# ─── Auth / Me ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    profile = request.user.profile
    return Response(MeSerializer(profile).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    profile = request.user.profile
    serializer = UpdateProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(MeSerializer(profile).data)
    return Response(serializer.errors, status=400)


# ─── User search & public profile ────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def search_users(request):
    q = request.query_params.get('q', '').strip()
    if len(q) < 2:
        return Response([])
    profiles = (
        UserProfile.objects
        .filter(username__icontains=q)
        .select_related('strava_athlete')[:10]
    )
    return Response(PublicProfileSerializer(profiles, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def user_profile_view(request, username):
    try:
        profile = UserProfile.objects.select_related('strava_athlete').get(username=username)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    viewer = _get_viewer_profile(request)
    data = PublicProfileSerializer(profile).data
    data['can_view_data'] = can_view_profile(viewer, profile)

    # Friendship status for the viewer
    if viewer and viewer.id != profile.id:
        if are_friends(viewer, profile):
            data['friendship_status'] = 'friends'
        else:
            pending_sent = FriendRequest.objects.filter(
                from_user=viewer, to_user=profile, status='pending'
            ).exists()
            pending_received = FriendRequest.objects.filter(
                from_user=profile, to_user=viewer, status='pending'
            ).exists()
            if pending_sent:
                data['friendship_status'] = 'request_sent'
            elif pending_received:
                data['friendship_status'] = 'request_received'
            else:
                data['friendship_status'] = 'none'
    elif viewer and viewer.id == profile.id:
        data['friendship_status'] = 'self'
    else:
        data['friendship_status'] = 'none'

    return Response(data)


# ─── User-scoped dashboard data ───────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def user_summary_view(request, username):
    profile, athlete, err = _resolve_viewable_athlete(request, username)
    if err:
        return err

    data_start = _data_start_filter(profile)
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
        'this_week': _aggregate_period(activities.filter(start_date__gte=week_start)),
        'this_month': _aggregate_period(activities.filter(start_date__gte=month_start)),
        'year_to_date': _aggregate_period(activities.filter(start_date__gte=year_start)),
        'all_time': _aggregate_period(activities),
    }
    return Response(summary)


class _ActivityPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET'])
@permission_classes([AllowAny])
def user_activities_view(request, username):
    profile, athlete, err = _resolve_viewable_athlete(request, username)
    if err:
        return err

    data_start = _data_start_filter(profile)
    qs = Activity.objects.filter(
        athlete=athlete,
        type__in=['Ride', 'VirtualRide', 'EBikeRide'],
    )
    if data_start:
        qs = qs.filter(start_date__gte=data_start)

    activity_type = request.query_params.get('type')
    if activity_type:
        qs = qs.filter(type=activity_type)

    indoor = request.query_params.get('indoor')
    if indoor is not None:
        if indoor.lower() == 'true':
            qs = qs.filter(Q(trainer=True) | Q(type='VirtualRide'))
        else:
            qs = qs.filter(trainer=False).exclude(type='VirtualRide')

    year = request.query_params.get('year')
    if year:
        qs = qs.filter(start_date__year=int(year))

    qs = qs.order_by('-start_date')

    paginator = _ActivityPagination()
    page = paginator.paginate_queryset(qs, request)
    serializer = ActivityListSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def user_activity_detail_view(request, username, activity_id):
    profile, athlete, err = _resolve_viewable_athlete(request, username)
    if err:
        return err

    try:
        activity = Activity.objects.select_related('athlete').prefetch_related('streams').get(
            id=activity_id, athlete=athlete
        )
    except Activity.DoesNotExist:
        return Response({'error': 'Activity not found'}, status=404)

    return Response(ActivityDetailSerializer(activity).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def user_weekly_trends_view(request, username):
    profile, athlete, err = _resolve_viewable_athlete(request, username)
    if err:
        return err

    data_start = _data_start_filter(profile)
    weeks_back = int(request.query_params.get('weeks', 12))

    qs = DerivedWeekly.objects.filter(athlete=athlete)
    if data_start:
        qs = qs.filter(week_start_date__gte=data_start)

    weekly_data = qs.order_by('-week_start_date')[:weeks_back]
    return Response(DerivedWeeklySerializer(weekly_data, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def user_milestones_view(request, username):
    profile, athlete, err = _resolve_viewable_athlete(request, username)
    if err:
        return err

    milestones = Milestone.objects.filter(athlete=athlete)
    from api.serializers import MilestoneSerializer
    return Response(MilestoneSerializer(milestones, many=True).data)


# ─── Friends ──────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def friends_list(request):
    profile = request.user.profile
    friendships = Friendship.objects.filter(
        Q(user1=profile) | Q(user2=profile)
    ).select_related('user1__strava_athlete', 'user2__strava_athlete')
    friends = [f.user2 if f.user1 == profile else f.user1 for f in friendships]
    return Response(PublicProfileSerializer(friends, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_friend(request, username):
    try:
        other = UserProfile.objects.get(username=username)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    profile = request.user.profile
    Friendship.objects.filter(
        Q(user1=profile, user2=other) | Q(user1=other, user2=profile)
    ).delete()
    FriendRequest.objects.filter(
        Q(from_user=profile, to_user=other) | Q(from_user=other, to_user=profile)
    ).delete()
    return Response({'status': 'removed'})


# ─── Friend requests ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_requests_view(request):
    profile = request.user.profile
    requests_qs = FriendRequest.objects.filter(
        to_user=profile, status=FriendRequest.STATUS_PENDING
    ).select_related('from_user__strava_athlete')
    return Response(FriendRequestSerializer(requests_qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_friend_request(request):
    username = request.data.get('username', '').strip()
    if not username:
        return Response({'error': 'username is required'}, status=400)

    try:
        to_profile = UserProfile.objects.select_related('strava_athlete').get(username=username)
    except UserProfile.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    from_profile = request.user.profile
    if from_profile.id == to_profile.id:
        return Response({'error': 'You cannot add yourself.'}, status=400)

    if are_friends(from_profile, to_profile):
        return Response({'error': 'You are already friends.'}, status=400)

    # Check if there is a pending request from the other side — auto-accept it
    reverse_request = FriendRequest.objects.filter(
        from_user=to_profile, to_user=from_profile, status=FriendRequest.STATUS_PENDING
    ).first()
    if reverse_request:
        reverse_request.status = FriendRequest.STATUS_ACCEPTED
        reverse_request.save()
        u1, u2 = sorted([from_profile, to_profile], key=lambda x: x.id)
        Friendship.objects.get_or_create(user1=u1, user2=u2)
        return Response({'status': 'accepted', 'message': 'You are now friends!'})

    obj, created = FriendRequest.objects.get_or_create(
        from_user=from_profile,
        to_user=to_profile,
        defaults={'status': FriendRequest.STATUS_PENDING},
    )
    if not created:
        if obj.status == FriendRequest.STATUS_REJECTED:
            obj.status = FriendRequest.STATUS_PENDING
            obj.save()
        return Response(FriendRequestSerializer(obj).data, status=200)

    return Response(FriendRequestSerializer(obj).data, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_friend_request(request, pk):
    try:
        friend_request = FriendRequest.objects.get(
            pk=pk, to_user=request.user.profile, status=FriendRequest.STATUS_PENDING
        )
    except FriendRequest.DoesNotExist:
        return Response({'error': 'Request not found'}, status=404)

    action = request.data.get('action')
    if action == 'accept':
        friend_request.status = FriendRequest.STATUS_ACCEPTED
        friend_request.save()
        u1, u2 = sorted([friend_request.from_user, friend_request.to_user], key=lambda x: x.id)
        Friendship.objects.get_or_create(user1=u1, user2=u2)
    elif action == 'reject':
        friend_request.status = FriendRequest.STATUS_REJECTED
        friend_request.save()
    else:
        return Response({'error': "action must be 'accept' or 'reject'"}, status=400)

    return Response({'status': friend_request.status})
