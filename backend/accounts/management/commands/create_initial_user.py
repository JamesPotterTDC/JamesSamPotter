"""
Management command: create_initial_user

Migrates the existing single-athlete setup to the new multi-user model by
creating a Django User and UserProfile linked to the first StravaAthlete in
the database.

Usage:
    python manage.py create_initial_user [--data-start YYYY-MM-DD]

Options:
    --data-start  ISO date from which to show activity data (default: no restriction)
"""
from datetime import date

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from accounts.models import UserProfile, generate_username
from strava_ingest.models import StravaAthlete


class Command(BaseCommand):
    help = 'Create the initial UserProfile for the existing StravaAthlete'

    def add_arguments(self, parser):
        parser.add_argument(
            '--data-start',
            type=str,
            default=None,
            help='ISO date (YYYY-MM-DD) from which to show activity data, e.g. 2026-01-01',
        )

    def handle(self, *args, **options):
        athlete = StravaAthlete.objects.first()
        if not athlete:
            self.stderr.write(self.style.ERROR('No StravaAthlete found. Connect Strava first.'))
            return

        # Check if already migrated
        if hasattr(athlete, 'user_profile'):
            self.stdout.write(self.style.WARNING(
                f'StravaAthlete {athlete} already has a UserProfile: '
                f'username="{athlete.user_profile.username}"'
            ))
            return

        username = generate_username(athlete.firstname, athlete.lastname, athlete.strava_id)

        # Create Django User (no usable password – Strava-only auth)
        django_user = User.objects.create_user(
            username=username,
            email='',
            password=None,
        )
        django_user.set_unusable_password()
        django_user.save()

        data_start = None
        if options['data_start']:
            try:
                data_start = date.fromisoformat(options['data_start'])
            except ValueError:
                self.stderr.write(self.style.ERROR(
                    f"Invalid --data-start date: {options['data_start']}"
                ))
                django_user.delete()
                return

        profile = UserProfile.objects.create(
            user=django_user,
            strava_athlete=athlete,
            username=username,
            visibility=UserProfile.VISIBILITY_PRIVATE,
            data_start_date=data_start,
        )

        self.stdout.write(self.style.SUCCESS(
            f'Created UserProfile for {athlete}\n'
            f'  username: {username}\n'
            f'  visibility: private\n'
            f'  data_start_date: {data_start or "none (all data)"}\n'
            f'\nYour public URL will be: /u/{username}'
        ))
