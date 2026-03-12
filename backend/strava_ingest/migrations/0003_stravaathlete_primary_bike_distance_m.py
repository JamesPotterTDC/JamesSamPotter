from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('strava_ingest', '0002_stravaathlete_ftp'),
    ]

    operations = [
        migrations.AddField(
            model_name='stravaathlete',
            name='primary_bike_distance_m',
            field=models.FloatField(blank=True, help_text='Total lifetime distance on primary bike from Strava gear data', null=True),
        ),
    ]
