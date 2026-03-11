import time
import logging
import requests
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from .models import StravaOAuthToken

logger = logging.getLogger(__name__)


class StravaRateLimiter:
    """Simple rate limiter for Strava API (15min and daily limits)."""
    
    def __init__(self):
        self.short_limit = 100
        self.short_usage = 0
        self.short_reset = time.time() + 900
        
        self.daily_limit = 1000
        self.daily_usage = 0
        self.daily_reset = time.time() + 86400

    def update_from_headers(self, headers):
        """Update limits from response headers."""
        if 'X-RateLimit-Limit' in headers:
            limits = headers['X-RateLimit-Limit'].split(',')
            self.short_limit = int(limits[0])
            self.daily_limit = int(limits[1])
        
        if 'X-RateLimit-Usage' in headers:
            usage = headers['X-RateLimit-Usage'].split(',')
            self.short_usage = int(usage[0])
            self.daily_usage = int(usage[1])

    def wait_if_needed(self):
        """Wait if approaching rate limits."""
        if self.short_usage >= self.short_limit * 0.9:
            wait_time = max(0, self.short_reset - time.time())
            if wait_time > 0:
                logger.warning(f"Approaching short rate limit, waiting {wait_time:.0f}s")
                time.sleep(wait_time)
        
        if self.daily_usage >= self.daily_limit * 0.95:
            logger.error("Approaching daily rate limit")
            raise Exception("Daily Strava API rate limit nearly exceeded")


class StravaClient:
    """Client for Strava API v3."""
    
    BASE_URL = 'https://www.strava.com/api/v3'
    OAUTH_URL = 'https://www.strava.com/oauth'
    
    def __init__(self, token_model=None):
        self.token_model = token_model
        self.rate_limiter = StravaRateLimiter()

    def get_authorize_url(self, redirect_uri, state=None):
        """Generate Strava OAuth authorization URL."""
        params = {
            'client_id': settings.STRAVA_CLIENT_ID,
            'response_type': 'code',
            'redirect_uri': redirect_uri,
            'approval_prompt': 'auto',
            'scope': 'activity:read_all,activity:write'
        }
        if state:
            params['state'] = state
        
        param_str = '&'.join(f"{k}={v}" for k, v in params.items())
        return f"{self.OAUTH_URL}/authorize?{param_str}"

    def exchange_code_for_token(self, code):
        """Exchange authorization code for access token."""
        response = requests.post(
            f"{self.OAUTH_URL}/token",
            data={
                'client_id': settings.STRAVA_CLIENT_ID,
                'client_secret': settings.STRAVA_CLIENT_SECRET,
                'code': code,
                'grant_type': 'authorization_code'
            }
        )
        response.raise_for_status()
        return response.json()

    def refresh_access_token(self):
        """Refresh expired access token."""
        if not self.token_model:
            raise ValueError("Token model required for refresh")
        
        refresh_token = self.token_model.get_refresh_token()
        
        response = requests.post(
            f"{self.OAUTH_URL}/token",
            data={
                'client_id': settings.STRAVA_CLIENT_ID,
                'client_secret': settings.STRAVA_CLIENT_SECRET,
                'refresh_token': refresh_token,
                'grant_type': 'refresh_token'
            }
        )
        response.raise_for_status()
        data = response.json()
        
        self.token_model.set_access_token(data['access_token'])
        self.token_model.set_refresh_token(data['refresh_token'])
        self.token_model.expires_at = timezone.make_aware(
            datetime.fromtimestamp(data['expires_at'])
        )
        self.token_model.save()
        
        logger.info(f"Refreshed token for athlete {self.token_model.athlete.strava_id}")
        return data['access_token']

    def get_valid_access_token(self):
        """Get valid access token, refreshing if necessary."""
        if not self.token_model:
            raise ValueError("Token model required")
        
        if self.token_model.is_expired:
            logger.info("Token expired, refreshing...")
            return self.refresh_access_token()
        
        return self.token_model.get_access_token()

    def _make_request(self, method, endpoint, **kwargs):
        """Make authenticated request to Strava API with rate limit handling."""
        self.rate_limiter.wait_if_needed()
        
        access_token = self.get_valid_access_token()
        headers = kwargs.pop('headers', {})
        headers['Authorization'] = f"Bearer {access_token}"
        
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            response = requests.request(method, url, headers=headers, timeout=30, **kwargs)
            
            self.rate_limiter.update_from_headers(response.headers)
            
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 900))
                logger.error(f"Rate limit exceeded (429), need to wait {retry_after}s")
                raise Exception(f"Strava rate limit exceeded, retry after {retry_after}s")
            
            response.raise_for_status()
            
            return response.json()
        
        except requests.exceptions.Timeout:
            logger.error(f"Request timeout for {endpoint}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {endpoint}: {e}")
            raise

    def get_athlete(self):
        """Get authenticated athlete."""
        return self._make_request('GET', '/athlete')

    def get_activities(self, page=1, per_page=30, after=None, before=None):
        """Get athlete activities."""
        params = {'page': page, 'per_page': per_page}
        if after:
            params['after'] = int(after.timestamp())
        if before:
            params['before'] = int(before.timestamp())
        
        return self._make_request('GET', '/athlete/activities', params=params)

    def get_activity(self, activity_id, include_all_efforts=False):
        """Get detailed activity by ID."""
        params = {'include_all_efforts': include_all_efforts}
        return self._make_request('GET', f'/activities/{activity_id}', params=params)

    def get_activity_streams(self, activity_id, keys=None):
        """Get activity streams (time-series data)."""
        if keys is None:
            keys = ['time', 'distance', 'latlng', 'altitude', 'velocity_smooth', 
                   'heartrate', 'cadence', 'watts', 'temp', 'moving', 'grade_smooth']
        
        keys_str = ','.join(keys)
        return self._make_request('GET', f'/activities/{activity_id}/streams', 
                                 params={'keys': keys_str, 'key_by_type': True})

    def get_athlete_zones(self):
        """Get athlete zones (HR, power)."""
        return self._make_request('GET', '/athlete/zones')
