from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'incremental-sync-hourly': {
        'task': 'strava_ingest.tasks.scheduled_incremental_sync',
        'schedule': crontab(minute=0),
    },
    'compute-metrics-daily': {
        'task': 'metrics.tasks.compute_all_metrics',
        'schedule': crontab(hour=2, minute=0),
    },
}
