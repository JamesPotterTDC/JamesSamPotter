from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ActivityViewSet, MilestoneViewSet, summary_view, weekly_trends, admin_sync
from .health import health_check, readiness_check
from strava_ingest.oauth import start_oauth, oauth_callback
from strava_ingest.webhook import webhook_verify, webhook_event

router = DefaultRouter()
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'milestones', MilestoneViewSet, basename='milestone')

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', summary_view, name='summary'),
    path('weekly-trends/', weekly_trends, name='weekly-trends'),
    path('admin/sync/', admin_sync, name='admin-sync'),
    path('health/', health_check, name='health'),
    path('ready/', readiness_check, name='ready'),
    path('strava/oauth/start/', start_oauth, name='strava-oauth-start'),
    path('strava/oauth/callback/', oauth_callback, name='strava-oauth-callback'),
    path('strava/webhook/', lambda request: (
        webhook_verify(request) if request.method == 'GET' else webhook_event(request)
    ), name='strava-webhook'),
]
