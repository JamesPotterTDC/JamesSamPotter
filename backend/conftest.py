import pytest
from django.conf import settings


@pytest.fixture(scope='session')
def django_db_setup():
    """Configure test database."""
    settings.DATABASES['default'] = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'test_cycling_dashboard',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'localhost',
        'PORT': '5432',
    }
