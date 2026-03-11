import pytest
from django.test import Client
from django.conf import settings
from strava_ingest.models import StravaAthlete, Activity
from django.utils import timezone


@pytest.fixture
def api_client():
    """Create test client."""
    return Client()


@pytest.fixture
def athlete_with_activities():
    """Create athlete with sample activities."""
    athlete = StravaAthlete.objects.create(
        strava_id=12345,
        firstname='Test',
        lastname='Athlete'
    )
    
    Activity.objects.create(
        athlete=athlete,
        strava_id=111,
        name='Morning Ride',
        type='Ride',
        start_date=timezone.now(),
        distance_m=25000,
        moving_time_s=3600,
        total_elevation_gain_m=250,
        trainer=False,
        raw_json={}
    )
    
    Activity.objects.create(
        athlete=athlete,
        strava_id=222,
        name='Indoor Training',
        type='VirtualRide',
        start_date=timezone.now(),
        distance_m=20000,
        moving_time_s=2400,
        total_elevation_gain_m=0,
        trainer=True,
        raw_json={}
    )
    
    return athlete


@pytest.mark.django_db
class TestAPIEndpoints:
    """Test REST API endpoints."""
    
    def test_health_check(self, api_client):
        """Test health endpoint."""
        response = api_client.get('/api/health/')
        assert response.status_code in [200, 503]
        data = response.json()
        assert 'status' in data
        assert 'checks' in data
    
    def test_summary_no_data(self, api_client):
        """Test summary with no data returns 404."""
        response = api_client.get('/api/summary/')
        assert response.status_code == 404
    
    def test_summary_with_data(self, api_client, athlete_with_activities):
        """Test summary endpoint returns aggregated data."""
        response = api_client.get('/api/summary/')
        assert response.status_code == 200
        
        data = response.json()
        assert 'athlete' in data
        assert 'year_to_date' in data
        assert 'this_week' in data
        
        ytd = data['year_to_date']
        assert ytd['total_rides'] == 2
        assert ytd['indoor_rides'] == 1
        assert ytd['outdoor_rides'] == 1
    
    def test_activities_list(self, api_client, athlete_with_activities):
        """Test activities list endpoint."""
        response = api_client.get('/api/activities/')
        assert response.status_code == 200
        
        data = response.json()
        assert 'results' in data
        assert len(data['results']) == 2
    
    def test_activities_filter_indoor(self, api_client, athlete_with_activities):
        """Test filtering activities by trainer."""
        response = api_client.get('/api/activities/?trainer=true')
        assert response.status_code == 200
        
        data = response.json()
        assert data['count'] == 1
        assert data['results'][0]['trainer'] is True
    
    def test_activity_detail(self, api_client, athlete_with_activities):
        """Test activity detail endpoint."""
        activity = Activity.objects.first()
        response = api_client.get(f'/api/activities/{activity.id}/')
        assert response.status_code == 200
        
        data = response.json()
        assert data['strava_id'] == activity.strava_id
        assert data['name'] == activity.name
    
    def test_milestones(self, api_client, athlete_with_activities):
        """Test milestones endpoint."""
        response = api_client.get('/api/milestones/')
        assert response.status_code == 200
    
    def test_admin_sync_unauthorized(self, api_client):
        """Test admin endpoint requires auth."""
        response = api_client.post('/api/admin/sync/', {})
        assert response.status_code == 401
    
    def test_admin_sync_authorized(self, api_client, athlete_with_activities, settings):
        """Test admin endpoint with valid token."""
        settings.ADMIN_API_TOKEN = 'test-token'
        
        response = api_client.post(
            '/api/admin/sync/',
            {},
            content_type='application/json',
            HTTP_AUTHORIZATION='Bearer test-token'
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'queued'
