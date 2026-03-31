from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.research import ResearchJob, JobStatus
from models.user import User, UserRole
from schemas.research import ResearchQueryRequest, JobCreatedResponse, JobStatusResponse
from services.research_service import run_research_pipeline
import uuid

router = APIRouter(prefix="/research", tags=["research"])

@router.post("/query", response_model=JobCreatedResponse)
async def submit_query(
    body: ResearchQueryRequest,
    db: AsyncSession = Depends(get_db),
    # require_role means only researchers and admins can submit queries
    current_user: User = Depends(require_role(UserRole.RESEARCHER, UserRole.ADMIN))
):
    """
    Submit a research question. Returns a job_id immediately.
    Agents run in the background — poll /research/status/{job_id} to check progress.
    """
    # Create the job record in Postgres
    job = ResearchJob(
        user_id=current_user.id,
        query=body.query,
        status=JobStatus.PENDING
    )
    db.add(job)
    await db.flush()  # get the UUID assigned without full commit

    await db.commit()
    
    try:
        result = run_research_pipeline.delay(
            job_id=str(job.id),
            query=body.query,
            max_papers=body.max_papers
        )
    except Exception as e:
        # Celery/Redis is down — mark the job as failed so it doesn't rot as PENDING
        job.status = JobStatus.FAILED
        job.error_message = f"Failed to dispatch to task queue: {e}"
        await db.commit()
        raise HTTPException(
            status_code=503,
            detail="Research pipeline is temporarily unavailable. The task queue could not be reached."
        )

    return JobCreatedResponse(
        job_id=job.id,
        status=JobStatus.PENDING,
        message="Research pipeline started. Poll /research/status/{job_id} for updates."
    )

@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check status of a research job. Returns the full report when completed."""
    job = await db.get(ResearchJob, job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Users can only see their own jobs — admins can see all
    if job.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")

    return JobStatusResponse(
    job_id=job.id,
    status=job.status,
    query=job.query,
    created_at=job.created_at,
    completed_at=job.completed_at,
    report=job.report,
    error_message=job.error_message,
    total_tokens_used=job.total_tokens_used,
    total_cost_usd=job.total_cost_usd,
)

@router.get("/history")
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all past research queries for the current user."""
    result = await db.execute(
        select(ResearchJob)
        .where(ResearchJob.user_id == current_user.id)
        .order_by(ResearchJob.created_at.desc())
        .limit(20)
    )
    jobs = result.scalars().all()
    return {"history": [
        {
            "job_id": str(j.id),
            "query": j.query,
            "status": j.status,
            "created_at": j.created_at,
            "total_cost_usd": j.total_cost_usd
        }
        for j in jobs
    ]}