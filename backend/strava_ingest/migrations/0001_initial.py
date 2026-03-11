# Generated migration for initial schema

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='StravaAthlete',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('strava_id', models.BigIntegerField(db_index=True, unique=True)),
                ('firstname', models.CharField(blank=True, max_length=255)),
                ('lastname', models.CharField(blank=True, max_length=255)),
                ('username', models.CharField(blank=True, max_length=255, null=True)),
                ('profile', models.URLField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'strava_athlete',
            },
        ),
        migrations.CreateModel(
            name='StravaOAuthToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('access_token_encrypted', models.TextField()),
                ('refresh_token_encrypted', models.TextField()),
                ('expires_at', models.DateTimeField()),
                ('scope', models.CharField(max_length=500)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('athlete', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='oauth_token', to='strava_ingest.stravaathlete')),
            ],
            options={
                'db_table': 'strava_oauth_token',
            },
        ),
        migrations.CreateModel(
            name='Activity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('strava_id', models.BigIntegerField(db_index=True, unique=True)),
                ('name', models.CharField(max_length=500)),
                ('type', models.CharField(max_length=100)),
                ('sport_type', models.CharField(blank=True, max_length=100)),
                ('start_date', models.DateTimeField(db_index=True)),
                ('timezone', models.CharField(blank=True, max_length=100)),
                ('trainer', models.BooleanField(db_index=True, default=False)),
                ('commute', models.BooleanField(default=False)),
                ('distance_m', models.FloatField(blank=True, null=True)),
                ('moving_time_s', models.IntegerField(blank=True, null=True)),
                ('elapsed_time_s', models.IntegerField(blank=True, null=True)),
                ('total_elevation_gain_m', models.FloatField(blank=True, null=True)),
                ('average_speed_mps', models.FloatField(blank=True, null=True)),
                ('max_speed_mps', models.FloatField(blank=True, null=True)),
                ('average_watts', models.FloatField(blank=True, null=True)),
                ('weighted_average_watts', models.FloatField(blank=True, null=True)),
                ('kilojoules', models.FloatField(blank=True, null=True)),
                ('average_heartrate', models.FloatField(blank=True, null=True)),
                ('max_heartrate', models.IntegerField(blank=True, null=True)),
                ('average_cadence', models.FloatField(blank=True, null=True)),
                ('map_polyline_summary', models.TextField(blank=True)),
                ('map_polyline_redacted', models.TextField(blank=True)),
                ('start_latlng', models.JSONField(blank=True, null=True)),
                ('end_latlng', models.JSONField(blank=True, null=True)),
                ('raw_json', models.JSONField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('athlete', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activities', to='strava_ingest.stravaathlete')),
            ],
            options={
                'db_table': 'activity',
                'ordering': ['-start_date'],
            },
        ),
        migrations.CreateModel(
            name='ActivityStream',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('streams_json', models.JSONField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('activity', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='streams', to='strava_ingest.activity')),
            ],
            options={
                'db_table': 'activity_stream',
            },
        ),
        migrations.CreateModel(
            name='SyncMetadata',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('last_sync_started_at', models.DateTimeField(blank=True, null=True)),
                ('last_sync_completed_at', models.DateTimeField(blank=True, null=True)),
                ('last_sync_status', models.CharField(default='pending', max_length=50)),
                ('last_activity_date', models.DateTimeField(blank=True, null=True)),
                ('webhook_subscription_id', models.IntegerField(blank=True, null=True)),
                ('athlete', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='sync_metadata', to='strava_ingest.stravaathlete')),
            ],
            options={
                'db_table': 'sync_metadata',
            },
        ),
        migrations.AddIndex(
            model_name='activity',
            index=models.Index(fields=['athlete', '-start_date'], name='activity_athlete_start_idx'),
        ),
        migrations.AddIndex(
            model_name='activity',
            index=models.Index(fields=['type', '-start_date'], name='activity_type_start_idx'),
        ),
    ]
