from django.db import models
from strava_ingest.models import StravaAthlete


class DerivedWeekly(models.Model):
    """Precomputed weekly aggregates for fast dashboard queries."""
    athlete = models.ForeignKey(StravaAthlete, on_delete=models.CASCADE, related_name='weekly_metrics')
    week_start_date = models.DateField(db_index=True)
    totals_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'derived_weekly'
        unique_together = [['athlete', 'week_start_date']]
        ordering = ['-week_start_date']

    def __str__(self):
        return f"Week {self.week_start_date} for {self.athlete}"


class Milestone(models.Model):
    """Track achievements and milestones."""
    athlete = models.ForeignKey(StravaAthlete, on_delete=models.CASCADE, related_name='milestones')
    key = models.CharField(max_length=100, db_index=True)
    title = models.CharField(max_length=255)
    payload = models.JSONField(default=dict)
    achieved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'milestone'
        unique_together = [['athlete', 'key']]
        ordering = ['-updated_at']

    def __str__(self):
        status = "achieved" if self.achieved_at else "in progress"
        return f"{self.title} ({status})"
