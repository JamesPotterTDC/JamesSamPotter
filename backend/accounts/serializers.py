from rest_framework import serializers
from .models import UserProfile, FriendRequest, Friendship, are_friends


class PublicProfileSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()
    avatar_url = serializers.ReadOnlyField()
    strava_id = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['username', 'display_name', 'avatar_url', 'visibility', 'strava_id']

    def get_strava_id(self, obj):
        if obj.strava_athlete:
            return obj.strava_athlete.strava_id
        return None


class MeSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()
    avatar_url = serializers.ReadOnlyField()
    strava_connected = serializers.SerializerMethodField()
    ftp = serializers.SerializerMethodField()
    primary_bike_distance_m = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'username', 'display_name', 'avatar_url', 'visibility',
            'data_start_date', 'strava_connected', 'ftp', 'primary_bike_distance_m',
            'created_at',
        ]

    def get_strava_connected(self, obj):
        return obj.strava_athlete is not None

    def get_ftp(self, obj):
        if obj.strava_athlete:
            return obj.strava_athlete.ftp
        return None

    def get_primary_bike_distance_m(self, obj):
        if obj.strava_athlete:
            return obj.strava_athlete.primary_bike_distance_m
        return None


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['username', 'visibility']

    def validate_username(self, value):
        import re
        if not re.match(r'^[a-z0-9][a-z0-9_-]{1,48}[a-z0-9]$', value):
            raise serializers.ValidationError(
                'Username must be 3–50 characters, lowercase letters, numbers, hyphens or underscores only.'
            )
        qs = UserProfile.objects.filter(username=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('That username is already taken.')
        return value


class FriendRequestSerializer(serializers.ModelSerializer):
    from_user = PublicProfileSerializer(read_only=True)
    to_user = PublicProfileSerializer(read_only=True)

    class Meta:
        model = FriendRequest
        fields = ['id', 'from_user', 'to_user', 'status', 'created_at']
