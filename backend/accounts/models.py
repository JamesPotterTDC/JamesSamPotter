import re
import unicodedata
from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q


def generate_username(firstname, lastname, strava_id):
    """Generate a unique slug-style username from Strava profile data."""
    name = f"{firstname}{lastname}"
    name = unicodedata.normalize('NFKD', name)
    name = name.encode('ascii', 'ignore').decode('ascii')
    name = re.sub(r'[^a-zA-Z0-9]', '', name).lower()
    if not name:
        name = f"rider{strava_id}"
    base = name[:28]
    username = base
    counter = 1
    while UserProfile.objects.filter(username=username).exists():
        suffix = str(counter)
        username = f"{base[:28 - len(suffix)]}{suffix}"
        counter += 1
    return username


class UserProfile(models.Model):
    VISIBILITY_PRIVATE = 'private'
    VISIBILITY_FRIENDS = 'friends'
    VISIBILITY_PUBLIC = 'public'
    VISIBILITY_CHOICES = [
        (VISIBILITY_PRIVATE, 'Private'),
        (VISIBILITY_FRIENDS, 'Friends'),
        (VISIBILITY_PUBLIC, 'Public'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    strava_athlete = models.OneToOneField(
        'strava_ingest.StravaAthlete',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_profile',
    )
    username = models.SlugField(max_length=50, unique=True, db_index=True)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default=VISIBILITY_PRIVATE)
    data_start_date = models.DateField(
        null=True, blank=True,
        help_text='Only show activity data from this date onwards',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profile'

    def __str__(self):
        return self.username

    @property
    def display_name(self):
        if self.strava_athlete:
            name = f"{self.strava_athlete.firstname} {self.strava_athlete.lastname}".strip()
            return name or self.username
        return self.username

    @property
    def avatar_url(self):
        if self.strava_athlete and self.strava_athlete.profile:
            return self.strava_athlete.profile
        return None


class FriendRequest(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    from_user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='sent_requests')
    to_user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='received_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'friend_request'
        unique_together = [['from_user', 'to_user']]

    def __str__(self):
        return f"{self.from_user} → {self.to_user} ({self.status})"


class Friendship(models.Model):
    user1 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='friendships_as_user1')
    user2 = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='friendships_as_user2')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'friendship'
        unique_together = [['user1', 'user2']]

    def __str__(self):
        return f"{self.user1} ↔ {self.user2}"


def are_friends(profile1, profile2):
    return Friendship.objects.filter(
        Q(user1=profile1, user2=profile2) | Q(user1=profile2, user2=profile1)
    ).exists()


def can_view_profile(viewer_profile, target_profile):
    """Check whether viewer_profile may see target_profile's dashboard data."""
    if target_profile.visibility == UserProfile.VISIBILITY_PUBLIC:
        return True
    if viewer_profile is None:
        return False
    if viewer_profile.id == target_profile.id:
        return True
    if target_profile.visibility == UserProfile.VISIBILITY_FRIENDS:
        return are_friends(viewer_profile, target_profile)
    return False
