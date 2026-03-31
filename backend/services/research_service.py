import os
from core.config import settings

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT

from core.celery_app import celery_app
from core.database import AsyncSessionLocal
from models.user import User
from models.research import ResearchJob, JobStatus
from agents.search_agent import run_search_agent
from agents.translation_agent import run_translation_agent
from agents.synthesis_agent import run_synthesis_agent
from services.eval_service import run_full_eval

from datetime import datetime
import asyncio
import uuid

# Celery tasks can't be async natively — we wrap with asyncio.run()
@celery_app.task(bind=True, name="run_research_pipeline")
def run_research_pipeline(self, job_id: str, query: str, max_papers: int = 20):
    """
    This is the Celery task — it runs in a background worker process.
    `bind=True` gives us access to `self` so we can update task state.
    """
    asyncio.run(_run_pipeline_async(job_id, query, max_papers))

async def _run_pipeline_async(job_id: str, query: str, max_papers: int):
    """The actual async pipeline logic."""
    async with AsyncSessionLocal() as db:
        # Step 1: Mark job as running
        job = await db.get(ResearchJob, uuid.UUID(job_id))
        if not job:
            return

        job.status = JobStatus.RUNNING
        await db.commit()

        try:
            # Step 2: Run the 3 agents in sequence
            # Each step's output feeds into the next
            print(f"[Pipeline] Starting search for: {query}")
            papers = await run_search_agent(query, max_papers)

            print(f"[Pipeline] Translating {len(papers)} papers...")
            translated_papers = await run_translation_agent(papers)

            print(f"[Pipeline] Synthesizing report...")
            report = await run_synthesis_agent(query, translated_papers)

            # Step 3: Extract LLMOps data
            token_usage = report.pop("_token_usage", {})

            # Step 4: Save completed report to database
            job.status = JobStatus.COMPLETED
            job.report = report
            job.completed_at = datetime.now(timezone.utc)
            job.total_tokens_used = token_usage.get("total_tokens")
            job.total_cost_usd = token_usage.get("estimated_cost_usd")

            await db.commit()

            eval_results = await run_full_eval(job_id, query, report)
            print(f"[Pipeline] Eval complete: {eval_results['overall_eval_score']}")

            print(f"[Pipeline] Job {job_id} completed successfully")

        except Exception as e:
            error_msg = str(e) or f"{type(e).__name__}: {repr(e)}"
            job.status = JobStatus.FAILED
            job.error_message = error_msg
            await db.commit()
            print(f"[Pipeline] Job {job_id} FAILED: {error_msg}")
            raise  # re-raise so Celery knows the task failed