from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('strava_ingest', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='stravaathlete',
            name='ftp',
            field=models.IntegerField(null=True, blank=True, help_text='FTP in watts from Strava athlete profile'),
        ),
    ]
