"""Privacy-focused tests to ensure no location leaks."""
import pytest
from django.utils import timezone
from django.test import Client
from .models import StravaAthlete, Activity
from .privacy import decode_polyline, encode_polyline, redact_polyline


@pytest.fixture
def sample_polyline():
    """Sample polyline with 50 points."""
    points = [(51.5 + i * 0.001, -0.1 + i * 0.001) for i in range(50)]
    return encode_polyline(points)


class TestPolylineCodec:
    """Test polyline encoding/decoding."""
    
    def test_encode_decode_round_trip(self):
        """Test encoding and decoding are inverse operations."""
        original_coords = [(51.5074, -0.1278), (51.5084, -0.1288), (51.5094, -0.1298)]
        
        encoded = encode_polyline(original_coords)
        decoded = decode_polyline(encoded)
        
        assert len(decoded) == len(original_coords)
        for i, (orig, dec) in enumerate(zip(original_coords, decoded)):
            assert abs(orig[0] - dec[0]) < 0.00001, f"Latitude mismatch at {i}"
            assert abs(orig[1] - dec[1]) < 0.00001, f"Longitude mismatch at {i}"
    
    def test_decode_empty(self):
        """Test decoding empty string."""
        assert decode_polyline('') == []
    
    def test_encode_empty(self):
        """Test encoding empty list."""
        assert encode_polyline([]) == ''


class TestPolylineRedaction:
    """Test route redaction for privacy."""
    
    def test_redact_removes_start_end(self, sample_polyline):
        """Test that redaction removes start and end segments."""
        original_coords = decode_polyline(sample_polyline)
        assert len(original_coords) == 50
        
        redacted = redact_polyline(sample_polyline, redact_percent=10)
        redacted_coords = decode_polyline(redacted)
        
        expected_removed = int(50 * 10 / 100)
        expected_remaining = 50 - (2 * expected_removed)
        
        assert len(redacted_coords) == expected_remaining
        assert len(redacted_coords) < len(original_coords)
    
    def test_redact_short_polyline_returns_empty(self):
        """Test that short polylines are not exposed."""
        short_coords = [(51.5 + i * 0.001, -0.1) for i in range(15)]
        short_polyline = encode_polyline(short_coords)
        
        redacted = redact_polyline(short_polyline, redact_percent=10, min_points=20)
        
        assert redacted == '', "Short polylines should return empty for privacy"
    
    def test_redact_configurable_percent(self, sample_polyline):
        """Test that redaction percentage is configurable."""
        redacted_10 = redact_polyline(sample_polyline, redact_percent=10)
        redacted_20 = redact_polyline(sample_polyline, redact_percent=20)
        
        coords_10 = decode_polyline(redacted_10)
        coords_20 = decode_polyline(redacted_20)
        
        assert len(coords_20) < len(coords_10), "Higher percent should remove more points"
    
    def test_redact_empty_polyline(self):
        """Test handling of empty polyline."""
        assert redact_polyline('') == ''
    
    def test_redact_invalid_polyline(self):
        """Test handling of invalid polyline."""
        result = redact_polyline('invalid_polyline_data')
        assert result == '', "Invalid polyline should return empty safely"


@pytest.mark.django_db
class TestAPIPrivacy:
    """Test that API never exposes precise locations."""
    
    @pytest.fixture
    def activity_with_map(self, sample_polyline):
        """Create activity with map data."""
        athlete = StravaAthlete.objects.create(
            strava_id=12345,
            firstname='Test',
            lastname='User'
        )
        
        return Activity.objects.create(
            athlete=athlete,
            strava_id=999,
            name='Test Ride',
            type='Ride',
            start_date=timezone.now(),
            distance_m=25000,
            moving_time_s=3600,
            trainer=False,
            map_polyline_summary=sample_polyline,
            map_polyline_redacted=redact_polyline(sample_polyline),
            start_latlng=[51.5074, -0.1278],
            end_latlng=[51.5174, -0.1378],
            raw_json={}
        )
    
    def test_activity_list_no_location_data(self, activity_with_map):
        """Test activity list never includes location data."""
        client = Client()
        response = client.get('/api/activities/')
        
        assert response.status_code == 200
        data = response.json()
        
        for activity in data['results']:
            assert 'start_latlng' not in activity
            assert 'end_latlng' not in activity
            assert 'map_polyline_summary' not in activity
    
    def test_activity_detail_no_precise_location(self, activity_with_map):
        """Test activity detail never exposes start/end coordinates."""
        client = Client()
        response = client.get(f'/api/activities/{activity_with_map.id}/')
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'start_latlng' not in data, "start_latlng must not be in response"
        assert 'end_latlng' not in data, "end_latlng must not be in response"
        
        if 'map_polyline' in data:
            assert data['map_polyline'] != activity_with_map.map_polyline_summary, \
                "Must return redacted polyline, not original"
    
    def test_streams_no_latlng(self, activity_with_map):
        """Test that streams never include latlng data."""
        client = Client()
        response = client.get(f'/api/activities/{activity_with_map.id}/')
        
        assert response.status_code == 200
        data = response.json()
        
        streams = data.get('streams')
        if streams:
            assert 'latlng' not in streams, "latlng stream must not be exposed"
            assert 'lat' not in streams, "lat stream must not be exposed"
            assert 'lng' not in streams, "lng stream must not be exposed"
    
    def test_indoor_activity_no_map(self):
        """Test indoor activities don't expose any map data."""
        athlete = StravaAthlete.objects.create(strava_id=123, firstname='Test', lastname='User')
        
        indoor = Activity.objects.create(
            athlete=athlete,
            strava_id=888,
            name='Indoor Training',
            type='VirtualRide',
            start_date=timezone.now(),
            distance_m=20000,
            moving_time_s=2400,
            trainer=True,
            raw_json={}
        )
        
        client = Client()
        response = client.get(f'/api/activities/{indoor.id}/')
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get('map_polyline', '') == '', "Indoor activity should have no map"
        assert 'start_latlng' not in data
        assert 'end_latlng' not in data
