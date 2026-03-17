import logging
from datetime import datetime

from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from django.shortcuts import redirect
from django.http import JsonResponse
from rest_framework_simplejwt.tokens import RefreshToken

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
    """Handle OAuth callback from Strava — creates/updates User + issues JWT."""
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

        # Fetch full athlete profile to capture FTP and primary bike distance
        try:
            import requests as _req
            resp = _req.get(
                'https://www.strava.com/api/v3/athlete',
                headers={'Authorization': f"Bearer {token_data['access_token']}"},
                timeout=10,
            )
            if resp.ok:
                profile = resp.json()
                update_fields = []
                ftp = profile.get('ftp')
                if ftp:
                    athlete.ftp = int(ftp)
                    update_fields.append('ftp')
                    logger.info(f"Stored Strava FTP {ftp}W for athlete {athlete.strava_id}")
                bikes = profile.get('bikes') or []
                primary = next((b for b in bikes if b.get('primary')), bikes[0] if bikes else None)
                if primary and primary.get('distance'):
                    athlete.primary_bike_distance_m = float(primary['distance'])
                    update_fields.append('primary_bike_distance_m')
                if update_fields:
                    athlete.save(update_fields=update_fields)
        except Exception as e:
            logger.warning(f"Could not fetch athlete profile: {e}")

        # Store / refresh OAuth tokens
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

        # ── Create or retrieve the Django User + UserProfile ──────────────────
        from accounts.models import UserProfile, generate_username

        is_new_user = False

        if hasattr(athlete, 'user_profile'):
            user_profile = athlete.user_profile
            django_user = user_profile.user
        else:
            # Brand new sign-up
            is_new_user = True
            username = generate_username(
                athlete.firstname, athlete.lastname, athlete.strava_id
            )
            django_user = User.objects.create_user(username=username, email='', password=None)
            django_user.set_unusable_password()
            django_user.save()

            user_profile = UserProfile.objects.create(
                user=django_user,
                strava_athlete=athlete,
                username=username,
                visibility=UserProfile.VISIBILITY_PRIVATE,
            )
            logger.info(f"Created new UserProfile username={username} for athlete {athlete.strava_id}")

            # Queue 365-day backfill for new accounts
            backfill_activities.delay(athlete.id, days=365)

        # ── Issue JWT ─────────────────────────────────────────────────────────
        refresh = RefreshToken.for_user(django_user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        redirect_url = (
            f"{settings.FRONTEND_URL}/auth/callback"
            f"?access={access_token}"
            f"&refresh={refresh_token}"
            f"&username={user_profile.username}"
            f"&is_new={'true' if is_new_user else 'false'}"
        )
        return redirect(redirect_url)

    except Exception as e:
        logger.exception(f"OAuth callback failed: {e}")
        return redirect(f"{settings.FRONTEND_URL}?error=callback_failed")
