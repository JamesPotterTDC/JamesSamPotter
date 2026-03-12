from rest_framework import serializers
from strava_ingest.models import Activity, StravaAthlete
from metrics.models import DerivedWeekly, Milestone


class ActivityListSerializer(serializers.ModelSerializer):
    """Serializer for activity list view."""
    
    class Meta:
        model = Activity
        fields = [
            'id', 'strava_id', 'name', 'type', 'sport_type',
            'start_date', 'trainer', 'distance_m', 'moving_time_s',
            'total_elevation_gain_m', 'average_watts', 'weighted_average_watts',
            'kilojoules', 'average_heartrate', 'max_heartrate', 'average_cadence',
        ]


class ActivityDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed activity view."""
    streams = serializers.SerializerMethodField()
    map_polyline = serializers.SerializerMethodField()
    
    class Meta:
        model = Activity
        fields = [
            'id', 'strava_id', 'name', 'type', 'sport_type',
            'start_date', 'timezone', 'trainer', 'commute',
            'distance_m', 'moving_time_s', 'elapsed_time_s',
            'total_elevation_gain_m', 'average_speed_mps', 'max_speed_mps',
            'average_watts', 'weighted_average_watts', 'kilojoules',
            'average_heartrate', 'max_heartrate', 'average_cadence',
            'map_polyline',
            'streams'
        ]
    
    def get_map_polyline(self, obj):
        """Return redacted polyline for privacy."""
        return obj.map_polyline_redacted or ''
    
    def get_streams(self, obj):
        """Include simplified streams if available (no latlng for privacy)."""
        if hasattr(obj, 'streams'):
            streams_json = obj.streams.streams_json
            
            simplified = {}
            for key in ['time', 'distance', 'altitude', 'heartrate', 'watts', 'cadence']:
                if key in streams_json:
                    stream_data = streams_json[key]
                    if 'data' in stream_data:
                        simplified[key] = stream_data['data']
            
            return simplified
        return None


class MilestoneSerializer(serializers.ModelSerializer):
    """Serializer for milestones."""
    
    class Meta:
        model = Milestone
        fields = ['id', 'key', 'title', 'payload', 'achieved_at', 'updated_at']


class DerivedWeeklySerializer(serializers.ModelSerializer):
    """Serializer for weekly metrics."""
    
    class Meta:
        model = DerivedWeekly
        fields = ['week_start_date', 'totals_json']
