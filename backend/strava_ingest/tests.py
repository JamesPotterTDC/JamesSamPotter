import pytest
from datetime import datetime, timedelta
from django.utils import timezone
from unittest.mock import Mock, patch
from .models import StravaAthlete, StravaOAuthToken, Activity
from .strava_client import StravaClient
from .ingest import save_activity_from_strava


@pytest.fixture
def athlete():
    """Create test athlete."""
    return StravaAthlete.objects.create(
        strava_id=12345,
        firstname='Test',
        lastname='Athlete',
        username='testathlete'
    )


@pytest.fixture
def oauth_token(athlete):
    """Create test OAuth token."""
    token = StravaOAuthToken.objects.create(
        athlete=athlete,
        expires_at=timezone.now() + timedelta(hours=6),
        scope='activity:read_all'
    )
    token.set_access_token('test_access_token')
    token.set_refresh_token('test_refresh_token')
    token.save()
    return token


@pytest.fixture
def sample_activity_data():
    """Sample activity data from Strava API."""
    return {
        'id': 999888777,
        'name': 'Morning Ride',
        'type': 'Ride',
        'sport_type': 'Ride',
        'start_date': '2024-02-15T08:30:00Z',
        'timezone': '(GMT+00:00) Europe/London',
        'trainer': False,
        'commute': False,
        'distance': 25000.0,
        'moving_time': 3600,
        'elapsed_time': 3900,
        'total_elevation_gain': 250.0,
        'average_speed': 6.94,
        'max_speed': 12.5,
        'average_watts': 180.0,
        'kilojoules': 648.0,
        'average_heartrate': 145.0,
        'max_heartrate': 175,
        'average_cadence': 85.0,
        'start_latlng': [51.5074, -0.1278],
        'end_latlng': [51.5074, -0.1278],
        'map': {
            'summary_polyline': 'mock_polyline_data'
        }
    }


@pytest.mark.django_db
class TestOAuthToken:
    """Test OAuth token encryption and refresh."""
    
    def test_token_encryption(self, athlete):
        """Test that tokens are encrypted properly."""
        token = StravaOAuthToken.objects.create(
            athlete=athlete,
            expires_at=timezone.now() + timedelta(hours=6),
            scope='activity:read_all'
        )
        
        original = 'secret_access_token'
        token.set_access_token(original)
        token.save()
        
        retrieved = token.get_access_token()
        assert retrieved == original
    
    def test_token_expiry(self, athlete):
        """Test token expiry detection."""
        expired_token = StravaOAuthToken.objects.create(
            athlete=athlete,
            expires_at=timezone.now() - timedelta(hours=1),
            scope='activity:read_all'
        )
        expired_token.set_access_token('expired')
        expired_token.set_refresh_token('refresh')
        expired_token.save()
        
        assert expired_token.is_expired
        
        valid_token = StravaOAuthToken.objects.create(
            athlete=athlete,
            expires_at=timezone.now() + timedelta(hours=6),
            scope='activity:read_all'
        )
        valid_token.set_access_token('valid')
        valid_token.set_refresh_token('refresh')
        valid_token.save()
        
        assert not valid_token.is_expired


@pytest.mark.django_db
class TestActivityIngest:
    """Test activity ingestion."""
    
    def test_save_activity_idempotent(self, athlete, sample_activity_data):
        """Test that saving the same activity twice is idempotent."""
        
        activity1, created1 = save_activity_from_strava(athlete, sample_activity_data, fetch_streams=False)
        assert created1
        assert activity1.strava_id == sample_activity_data['id']
        assert activity1.name == 'Morning Ride'
        assert activity1.distance_m == 25000.0
        assert activity1.start_latlng is None, "start_latlng must be None for privacy"
        assert activity1.end_latlng is None, "end_latlng must be None for privacy"
        
        modified_data = sample_activity_data.copy()
        modified_data['name'] = 'Morning Ride (Updated)'
        
        activity2, created2 = save_activity_from_strava(athlete, modified_data, fetch_streams=False)
        assert not created2
        assert activity2.id == activity1.id
        assert activity2.name == 'Morning Ride (Updated)'
        assert Activity.objects.count() == 1
    
    def test_activity_filtering(self, athlete, sample_activity_data):
        """Test activity queries."""
        
        save_activity_from_strava(athlete, sample_activity_data, fetch_streams=False)
        
        indoor_data = sample_activity_data.copy()
        indoor_data['id'] = 999888778
        indoor_data['trainer'] = True
        save_activity_from_strava(athlete, indoor_data, fetch_streams=False)
        
        assert Activity.objects.count() == 2
        assert Activity.objects.filter(trainer=True).count() == 1
        assert Activity.objects.filter(trainer=False).count() == 1


@pytest.mark.django_db
class TestWebhook:
    """Test webhook processing."""
    
    @patch('strava_ingest.webhook.process_webhook_event')
    def test_webhook_event_enqueues_task(self, mock_task, client):
        """Test that webhook events enqueue Celery tasks."""
        
        event_data = {
            'object_type': 'activity',
            'aspect_type': 'create',
            'object_id': 12345,
            'owner_id': 67890,
            'event_time': 1234567890
        }
        
        response = client.post(
            '/api/strava/webhook/',
            data=event_data,
            content_type='application/json'
        )
        
        assert response.status_code == 200
        assert mock_task.delay.called
