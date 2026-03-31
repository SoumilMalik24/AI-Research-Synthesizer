from celery import Celery
from core.config import settings

celery_app = Celery(
    "research_synthesizer",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,   
    include=["services.research_service"]  
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    task_track_started=True,  
)