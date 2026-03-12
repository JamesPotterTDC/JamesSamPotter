from django.db import models
from django.utils import timezone
from cryptography.fernet import Fernet
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def get_cipher():
    """Get Fernet cipher for token encryption."""
    key = settings.ENCRYPTION_KEY
    if not key:
        logger.warning("ENCRYPTION_KEY not set, token encryption disabled")
        return None
    return Fernet(key.encode())


class StravaAthlete(models.Model):
    strava_id = models.BigIntegerField(unique=True, db_index=True)
    firstname = models.CharField(max_length=255, blank=True)
    lastname = models.CharField(max_length=255, blank=True)
    username = models.CharField(max_length=255, blank=True, null=True)
    profile = models.URLField(max_length=500, blank=True)
    ftp = models.IntegerField(null=True, blank=True, help_text='FTP in watts from Strava athlete profile')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'strava_athlete'

    def __str__(self):
        return f"{self.firstname} {self.lastname} ({self.strava_id})"


class StravaOAuthToken(models.Model):
    athlete = models.OneToOneField(StravaAthlete, on_delete=models.CASCADE, related_name='oauth_token')
    access_token_encrypted = models.TextField()
    refresh_token_encrypted = models.TextField()
    expires_at = models.DateTimeField()
    scope = models.CharField(max_length=500)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'strava_oauth_token'

    def set_access_token(self, token):
        cipher = get_cipher()
        if cipher:
            self.access_token_encrypted = cipher.encrypt(token.encode()).decode()
        else:
            self.access_token_encrypted = token

    def get_access_token(self):
        cipher = get_cipher()
        if cipher and self.access_token_encrypted:
            try:
                return cipher.decrypt(self.access_token_encrypted.encode()).decode()
            except Exception as e:
                logger.error(f"Failed to decrypt access token: {e}")
                return self.access_token_encrypted
        return self.access_token_encrypted

    def set_refresh_token(self, token):
        cipher = get_cipher()
        if cipher:
            self.refresh_token_encrypted = cipher.encrypt(token.encode()).decode()
        else:
            self.refresh_token_encrypted = token

    def get_refresh_token(self):
        cipher = get_cipher()
        if cipher and self.refresh_token_encrypted:
            try:
                return cipher.decrypt(self.refresh_token_encrypted.encode()).decode()
            except Exception as e:
                logger.error(f"Failed to decrypt refresh token: {e}")
                return self.refresh_token_encrypted
        return self.refresh_token_encrypted

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"Token for {self.athlete}"


class Activity(models.Model):
    athlete = models.ForeignKey(StravaAthlete, on_delete=models.CASCADE, related_name='activities')
    strava_id = models.BigIntegerField(unique=True, db_index=True)
    name = models.CharField(max_length=500)
    type = models.CharField(max_length=100)
    sport_type = models.CharField(max_length=100, blank=True)
    start_date = models.DateTimeField(db_index=True)
    timezone = models.CharField(max_length=100, blank=True)
    
    trainer = models.BooleanField(default=False, db_index=True)
    commute = models.BooleanField(default=False)
    
    distance_m = models.FloatField(null=True, blank=True)
    moving_time_s = models.IntegerField(null=True, blank=True)
    elapsed_time_s = models.IntegerField(null=True, blank=True)
    total_elevation_gain_m = models.FloatField(null=True, blank=True)
    
    average_speed_mps = models.FloatField(null=True, blank=True)
    max_speed_mps = models.FloatField(null=True, blank=True)
    
    average_watts = models.FloatField(null=True, blank=True)
    weighted_average_watts = models.FloatField(null=True, blank=True)
    kilojoules = models.FloatField(null=True, blank=True)
    
    average_heartrate = models.FloatField(null=True, blank=True)
    max_heartrate = models.IntegerField(null=True, blank=True)
    average_cadence = models.FloatField(null=True, blank=True)
    
    map_polyline_summary = models.TextField(blank=True)
    map_polyline_redacted = models.TextField(blank=True)
    start_latlng = models.JSONField(null=True, blank=True)
    end_latlng = models.JSONField(null=True, blank=True)
    
    raw_json = models.JSONField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'activity'
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['athlete', '-start_date'], name='activity_athlete_start_idx'),
            models.Index(fields=['type', '-start_date'], name='activity_type_start_idx'),
        ]

    def __str__(self):
        return f"{self.name} ({self.start_date.date()})"

    @property
    def is_ride(self):
        return self.type in ['Ride', 'VirtualRide', 'EBikeRide']


class ActivityStream(models.Model):
    activity = models.OneToOneField(Activity, on_delete=models.CASCADE, related_name='streams')
    streams_json = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_stream'

    def __str__(self):
        return f"Streams for {self.activity.strava_id}"


class SyncMetadata(models.Model):
    """Track sync status per athlete."""
    athlete = models.OneToOneField(StravaAthlete, on_delete=models.CASCADE, related_name='sync_metadata')
    last_sync_started_at = models.DateTimeField(null=True, blank=True)
    last_sync_completed_at = models.DateTimeField(null=True, blank=True)
    last_sync_status = models.CharField(max_length=50, default='pending')
    last_activity_date = models.DateTimeField(null=True, blank=True)
    webhook_subscription_id = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'sync_metadata'

    def __str__(self):
        return f"Sync metadata for {self.athlete}"
