# Empty migration to resolve Django's state check
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('strava_ingest', '0001_initial'),
    ]

    operations = [
        # No operations - models already match schema
    ]
