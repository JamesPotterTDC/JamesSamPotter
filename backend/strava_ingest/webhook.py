import logging
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .tasks import process_webhook_event

logger = logging.getLogger(__name__)


@require_http_methods(["GET"])
def webhook_verify(request):
    """Verify webhook subscription per Strava requirements."""
    mode = request.GET.get('hub.mode')
    token = request.GET.get('hub.verify_token')
    challenge = request.GET.get('hub.challenge')
    
    if mode == 'subscribe' and token == settings.STRAVA_WEBHOOK_VERIFY_TOKEN:
        logger.info("Webhook verification successful")
        return JsonResponse({'hub.challenge': challenge})
    
    logger.warning("Webhook verification failed")
    return JsonResponse({'error': 'Verification failed'}, status=403)


@csrf_exempt
@require_http_methods(["POST"])
def webhook_event(request):
    """Receive webhook events from Strava."""
    try:
        data = json.loads(request.body)
        logger.info(f"Received webhook event: {data}")
        
        object_type = data.get('object_type')
        aspect_type = data.get('aspect_type')
        object_id = data.get('object_id')
        owner_id = data.get('owner_id')
        
        if object_type == 'activity' and aspect_type in ['create', 'update']:
            process_webhook_event.delay(
                object_type=object_type,
                aspect_type=aspect_type,
                object_id=object_id,
                owner_id=owner_id,
                event_time=data.get('event_time')
            )
            logger.info(f"Enqueued webhook processing for activity {object_id}")
        
        return JsonResponse({'status': 'EVENT_RECEIVED'})
    
    except Exception as e:
        logger.exception(f"Webhook event processing failed: {e}")
        return JsonResponse({'error': 'Processing failed'}, status=500)
