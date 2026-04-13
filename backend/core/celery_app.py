from celery import Celery
from core.config import settings

# FIX: Separated broker and backend Redis instances to improve performance under high load.
celery_app = Celery(
    "research_synthesizer",
    broker=settings.REDIS_BROKER_URL,  # Assume settings has been updated to include REDIS_BROKER_URL
    backend=settings.REDIS_BACKEND_URL,  # Assume settings has been updated to include REDIS_BACKEND_URL
    include=["services.research_service"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # FIX: Made timezone configurable through settings to support multiple time zones.
    timezone=settings.TIMEZONE,  # Assume settings has been updated to include TIMEZONE
    task_track_started=True,
)