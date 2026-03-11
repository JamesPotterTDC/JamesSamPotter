from django.contrib import admin
from .models import StravaAthlete, StravaOAuthToken, Activity, ActivityStream, SyncMetadata


@admin.register(StravaAthlete)
class StravaAthleteAdmin(admin.ModelAdmin):
    list_display = ['strava_id', 'firstname', 'lastname', 'username', 'created_at']
    search_fields = ['firstname', 'lastname', 'username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(StravaOAuthToken)
class StravaOAuthTokenAdmin(admin.ModelAdmin):
    list_display = ['athlete', 'expires_at', 'updated_at']
    readonly_fields = ['updated_at']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['strava_id', 'name', 'athlete', 'type', 'start_date', 'trainer', 'distance_m', 'moving_time_s']
    list_filter = ['type', 'sport_type', 'trainer', 'commute']
    search_fields = ['name', 'strava_id']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'start_date'


@admin.register(ActivityStream)
class ActivityStreamAdmin(admin.ModelAdmin):
    list_display = ['activity', 'created_at']
    readonly_fields = ['created_at']


@admin.register(SyncMetadata)
class SyncMetadataAdmin(admin.ModelAdmin):
    list_display = ['athlete', 'last_sync_status', 'last_sync_completed_at', 'last_activity_date']
    readonly_fields = ['last_sync_started_at', 'last_sync_completed_at']
