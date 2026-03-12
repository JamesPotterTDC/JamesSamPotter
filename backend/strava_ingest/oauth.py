import logging
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.shortcuts import redirect
from django.http import JsonResponse
from .models import StravaAthlete, StravaOAuthToken
from .strava_client import StravaClient
from .tasks import backfill_activities

logger = logging.getLogger(__name__)


def start_oauth(request):
    """Initiate OAuth flow by redirecting to Strava."""
    redirect_uri = f"{settings.FRONTEND_URL}/auth/callback"
    
    client = StravaClient()
    auth_url = client.get_authorize_url(redirect_uri=redirect_uri)
    
    return redirect(auth_url)


def oauth_callback(request):
    """Handle OAuth callback from Strava."""
    code = request.GET.get('code')
    error = request.GET.get('error')
    
    if error:
        logger.error(f"OAuth error: {error}")
        return redirect(f"{settings.FRONTEND_URL}?error=oauth_failed")
    
    if not code:
        logger.error("No authorization code received")
        return redirect(f"{settings.FRONTEND_URL}?error=no_code")
    
    try:
        client = StravaClient()
        token_data = client.exchange_code_for_token(code)
        
        athlete_data = token_data['athlete']
        athlete, created = StravaAthlete.objects.update_or_create(
            strava_id=athlete_data['id'],
            defaults={
                'firstname': athlete_data.get('firstname', ''),
                'lastname': athlete_data.get('lastname', ''),
                'username': athlete_data.get('username', ''),
                'profile': athlete_data.get('profile', ''),
            }
        )
        
        expires_at = timezone.make_aware(
            datetime.fromtimestamp(token_data['expires_at'])
        )
        
        try:
            oauth_token = StravaOAuthToken.objects.get(athlete=athlete)
        except StravaOAuthToken.DoesNotExist:
            oauth_token = StravaOAuthToken(athlete=athlete)
        oauth_token.set_access_token(token_data['access_token'])
        oauth_token.set_refresh_token(token_data['refresh_token'])
        oauth_token.expires_at = expires_at
        oauth_token.scope = token_data.get('scope', '')
        oauth_token.save()
        
        logger.info(f"OAuth successful for athlete {athlete.strava_id}")
        
        backfill_activities.delay(athlete.id, days=365)
        
        return redirect(f"{settings.FRONTEND_URL}?success=true&athlete_id={athlete.id}")
    
    except Exception as e:
        logger.exception(f"OAuth callback failed: {e}")
        return redirect(f"{settings.FRONTEND_URL}?error=callback_failed")
