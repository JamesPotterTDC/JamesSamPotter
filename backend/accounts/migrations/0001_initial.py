import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('strava_ingest', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('username', models.SlugField(max_length=50, unique=True)),
                ('visibility', models.CharField(
                    choices=[('private', 'Private'), ('friends', 'Friends'), ('public', 'Public')],
                    default='private',
                    max_length=20,
                )),
                ('data_start_date', models.DateField(
                    blank=True,
                    help_text='Only show activity data from this date onwards',
                    null=True,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='profile',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('strava_athlete', models.OneToOneField(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='user_profile',
                    to='strava_ingest.stravaathlete',
                )),
            ],
            options={
                'db_table': 'user_profile',
            },
        ),
        migrations.CreateModel(
            name='FriendRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(
                    choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')],
                    default='pending',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('from_user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sent_requests',
                    to='accounts.userprofile',
                )),
                ('to_user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='received_requests',
                    to='accounts.userprofile',
                )),
            ],
            options={
                'db_table': 'friend_request',
            },
        ),
        migrations.AlterUniqueTogether(
            name='friendrequest',
            unique_together={('from_user', 'to_user')},
        ),
        migrations.CreateModel(
            name='Friendship',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user1', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='friendships_as_user1',
                    to='accounts.userprofile',
                )),
                ('user2', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='friendships_as_user2',
                    to='accounts.userprofile',
                )),
            ],
            options={
                'db_table': 'friendship',
            },
        ),
        migrations.AlterUniqueTogether(
            name='friendship',
            unique_together={('user1', 'user2')},
        ),
    ]
