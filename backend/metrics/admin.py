from django.contrib import admin
from .models import DerivedWeekly, Milestone


@admin.register(DerivedWeekly)
class DerivedWeeklyAdmin(admin.ModelAdmin):
    list_display = ['athlete', 'week_start_date', 'created_at', 'updated_at']
    list_filter = ['week_start_date']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ['athlete', 'key', 'title', 'achieved_at', 'updated_at']
    list_filter = ['key', 'achieved_at']
    readonly_fields = ['created_at', 'updated_at']
