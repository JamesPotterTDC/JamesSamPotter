from django.urls import path
from . import views

urlpatterns = [
    # Auth / me
    path('auth/me/', views.me_view, name='auth-me'),
    path('profile/', views.update_profile_view, name='profile-update'),

    # User search & public profiles
    path('users/search/', views.search_users, name='user-search'),
    path('users/<slug:username>/', views.user_profile_view, name='user-profile'),
    path('users/<slug:username>/summary/', views.user_summary_view, name='user-summary'),
    path('users/<slug:username>/activities/', views.user_activities_view, name='user-activities'),
    path('users/<slug:username>/activities/<int:activity_id>/', views.user_activity_detail_view, name='user-activity-detail'),
    path('users/<slug:username>/weekly-trends/', views.user_weekly_trends_view, name='user-weekly-trends'),
    path('users/<slug:username>/milestones/', views.user_milestones_view, name='user-milestones'),

    # Friends
    path('friends/', views.friends_list, name='friends-list'),
    path('friends/<slug:username>/', views.remove_friend, name='friend-remove'),

    # Friend requests
    path('friend-requests/', views.pending_requests_view, name='friend-requests-list'),
    path('friend-requests/send/', views.send_friend_request, name='friend-request-send'),
    path('friend-requests/<int:pk>/respond/', views.respond_to_friend_request, name='friend-request-respond'),
]
