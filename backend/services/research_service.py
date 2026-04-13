import os
from core.config import settings

# FIX: Use a configuration management tool to handle environment variables instead of hardcoding them.
from dotenv import load_dotenv

load_dotenv()

os.environ["LANGCHAIN_TRACING_V2"] = os.getenv("LANGCHAIN_TRACING_V2", "true")
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY", settings.LANGCHAIN_API_KEY)
os.environ["LANGCHAIN_PROJECT"] = os.getenv("LANGCHAIN_PROJECT", settings.LANGCHAIN_PROJECT)

from core.celery_app import celery_app
from models.user import User  # must be imported so SQLAlchemy metadata knows about the `users` table
from models.research import ResearchJob, JobStatus
from agents.search_agent import run_search_agent
from agents.translation_agent import run_translation_agent
from agents.synthesis_agent import run_synthesis_agent
from services.eval_service import run_full_eval

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import asyncio
import uuid

# FIX: Reuse the database engine across multiple task executions to improve performance.
engine = None
SessionLocal = None

def _make_session_factory():
    """
    Create a fresh async engine + session factory bound to the CURRENT event loop.

    Why not reuse the module-level engine from database.py?
    asyncpg binds its connection pool to the event loop that was active when the
    engine was first used. Celery calls asyncio.run() which creates a brand-new
    event loop — the old pool's proactor becomes None and crashes with
    "AttributeError: 'NoneType' object has no attribute 'send'".

    Solution: build a fresh engine inside the task so it binds to the correct loop.
    """
    global engine, SessionLocal
    if engine is None or SessionLocal is None:
        # Strip all query params (sslmode, channel_binding, etc.) just like in core.database
        DATABASE_URL = (
            settings.DATABASE_URL
            .replace("postgresql://", "postgresql+asyncpg://")
            .replace("postgres://", "postgresql+asyncpg://")
            .split("?")[0]
        )
        # Required to pass ssl=True since we stripped sslmode from the URL above
        engine = create_async_engine(DATABASE_URL, echo=False, connect_args={"ssl": True})
        SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return engine, SessionLocal


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
    # Build a fresh engine bound to THIS event loop (created by asyncio.run above)
    engine, SessionLocal = _make_session_factory()

    try:
        async with SessionLocal() as db:
            # Step 1: Mark job as running
            job = await db.get(ResearchJob, uuid.UUID(job_id))
            if not job:
                return

            job.status = JobStatus.RUNNING
            await db.commit()

            try:
                # Step 2: Run the 3 agents in sequence
                # FIX: Sanitize logs to avoid exposing sensitive information.
                print(f"[Pipeline] Starting search for job ID: {job_id}")
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
    finally:
        # Always dispose the engine to close all asyncpg connections cleanly
        await engine.dispose()