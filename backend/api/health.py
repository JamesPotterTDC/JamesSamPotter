import logging
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache

logger = logging.getLogger(__name__)


def health_check(request):
    """Health check endpoint for monitoring."""
    health = {
        'status': 'healthy',
        'checks': {}
    }
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health['checks']['database'] = 'ok'
    except Exception as e:
        health['checks']['database'] = f'error: {str(e)}'
        health['status'] = 'unhealthy'
    
    try:
        cache.set('health_check', 'ok', 10)
        result = cache.get('health_check')
        health['checks']['redis'] = 'ok' if result == 'ok' else 'error'
    except Exception as e:
        health['checks']['redis'] = f'error: {str(e)}'
        health['status'] = 'unhealthy'
    
    status_code = 200 if health['status'] == 'healthy' else 503
    return JsonResponse(health, status=status_code)


def readiness_check(request):
    """Readiness check for container orchestration."""
    return JsonResponse({'status': 'ready'})
