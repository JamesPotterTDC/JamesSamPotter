# Generated migration for metrics models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('strava_ingest', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DerivedWeekly',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('week_start_date', models.DateField(db_index=True)),
                ('totals_json', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('athlete', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='weekly_metrics', to='strava_ingest.stravaathlete')),
            ],
            options={
                'db_table': 'derived_weekly',
                'ordering': ['-week_start_date'],
            },
        ),
        migrations.CreateModel(
            name='Milestone',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(db_index=True, max_length=100)),
                ('title', models.CharField(max_length=255)),
                ('payload', models.JSONField(default=dict)),
                ('achieved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('athlete', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='milestones', to='strava_ingest.stravaathlete')),
            ],
            options={
                'db_table': 'milestone',
                'ordering': ['-updated_at'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='derivedweekly',
            unique_together={('athlete', 'week_start_date')},
        ),
        migrations.AlterUniqueTogether(
            name='milestone',
            unique_together={('athlete', 'key')},
        ),
    ]
