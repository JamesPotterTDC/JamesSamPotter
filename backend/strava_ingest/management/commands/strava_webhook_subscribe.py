import requests
import logging
from django.core.management.base import BaseCommand
from django.conf import settings

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Subscribe to Strava webhook events'

    def add_arguments(self, parser):
        parser.add_argument(
            '--callback-url',
            type=str,
            required=True,
            help='Public callback URL for webhooks'
        )
        parser.add_argument(
            '--verify-token',
            type=str,
            help='Verify token (defaults to STRAVA_WEBHOOK_VERIFY_TOKEN)'
        )

    def handle(self, *args, **options):
        callback_url = options['callback_url']
        verify_token = options.get('verify_token') or settings.STRAVA_WEBHOOK_VERIFY_TOKEN
        
        if not verify_token:
            self.stdout.write(self.style.ERROR('Verify token is required'))
            return
        
        self.stdout.write(f"Subscribing to Strava webhooks...")
        self.stdout.write(f"Callback URL: {callback_url}")
        
        try:
            response = requests.post(
                'https://www.strava.com/api/v3/push_subscriptions',
                data={
                    'client_id': settings.STRAVA_CLIENT_ID,
                    'client_secret': settings.STRAVA_CLIENT_SECRET,
                    'callback_url': callback_url,
                    'verify_token': verify_token
                }
            )
            
            response.raise_for_status()
            data = response.json()
            
            self.stdout.write(self.style.SUCCESS(f"✓ Subscription created: {data}"))
            self.stdout.write(f"  Subscription ID: {data.get('id')}")
            
        except requests.exceptions.HTTPError as e:
            self.stdout.write(self.style.ERROR(f"✗ Subscription failed: {e}"))
            if e.response is not None:
                self.stdout.write(f"  Response: {e.response.text}")
