from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from core.database import get_db
from core.dependencies import require_role
from models.user import User, UserRole
from models.research import ResearchJob, JobStatus
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/admin", tags=["admin"])

# Every single route in this file uses require_role(UserRole.ADMIN)
# If a non-admin hits any of these, they get 403 Forbidden automatically
# This is RBAC in action — the role check happens before the function runs

class RoleUpdateRequest(BaseModel):
    role: UserRole

# ─────────────────────────────────────────────
# GET /admin/users — see all users
# ─────────────────────────────────────────────
@router.get("/users")
async def get_all_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Returns all users on the platform.
    Only admins can see this — normal users get 403.
    """
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    return {"users": [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value,
            "is_active": u.is_active,
            "google_user": u.google_id is not None,  # did they sign up via Google?
            "created_at": u.created_at,
        }
        for u in users
    ]}


# ─────────────────────────────────────────────
# GET /admin/jobs — see all jobs across all users
# ─────────────────────────────────────────────
@router.get("/jobs")
async def get_all_jobs(
    status: Optional[str] = None,   # filter by status e.g. ?status=failed
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Returns all research jobs across all users.
    Optionally filter by status: ?status=failed to see all failed jobs.
    """
    query = select(ResearchJob).order_by(ResearchJob.created_at.desc()).limit(limit)

    # If a status filter was passed, add it to the query
    if status:
        try:
            status_enum = JobStatus(status)
            query = query.where(ResearchJob.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    result = await db.execute(query)
    jobs = result.scalars().all()

    return {"jobs": [
        {
            "job_id": str(j.id),
            "user_id": str(j.user_id),
            "query": j.query,
            "status": j.status.value,
            "total_tokens_used": j.total_tokens_used,
            "total_cost_usd": j.total_cost_usd,
            "created_at": j.created_at,
            "completed_at": j.completed_at,
            "error_message": j.error_message,
        }
        for j in jobs
    ]}


# ─────────────────────────────────────────────
# GET /admin/stats — platform-wide analytics
# ─────────────────────────────────────────────
@router.get("/stats")
async def get_platform_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Platform-wide analytics — total users, total jobs, total cost, success rate.
    This is the kind of data a startup founder looks at every morning.
    """
    # Count total users
    user_count = await db.execute(select(func.count(User.id)))
    total_users = user_count.scalar()

    # Count jobs by status
    job_stats = await db.execute(
        select(ResearchJob.status, func.count(ResearchJob.id))
        .group_by(ResearchJob.status)
    )
    job_counts = {row[0].value: row[1] for row in job_stats.all()}

    # Sum total cost across ALL jobs
    cost_result = await db.execute(
        select(func.sum(ResearchJob.total_cost_usd))
        .where(ResearchJob.total_cost_usd.isnot(None))
    )
    total_cost = cost_result.scalar() or 0.0

    # Sum total tokens across ALL jobs
    token_result = await db.execute(
        select(func.sum(ResearchJob.total_tokens_used))
        .where(ResearchJob.total_tokens_used.isnot(None))
    )
    total_tokens = token_result.scalar() or 0.0

    total_jobs = sum(job_counts.values())
    completed = job_counts.get("completed", 0)
    success_rate = round(completed / total_jobs * 100, 1) if total_jobs > 0 else 0

    return {
        "total_users": total_users,
        "total_jobs": total_jobs,
        "jobs_by_status": job_counts,
        "success_rate_percent": success_rate,
        "total_cost_usd": round(total_cost, 4),
        "total_tokens_used": int(total_tokens),
        "avg_cost_per_job": round(total_cost / completed, 4) if completed > 0 else 0,
    }


# ─────────────────────────────────────────────
# PATCH /admin/users/{user_id}/role — change a user's role
# ─────────────────────────────────────────────
@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    body: RoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """
    Change a user's role. Use this to promote someone to admin
    or demote them back to researcher.

    PATCH is used instead of PUT because we're only updating ONE field,
    not replacing the whole user object.
    """
    # Find the user to update
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from accidentally removing their own admin role
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own role"
        )

    old_role = user.role.value
    user.role = body.role
    await db.commit()

    return {
        "message": f"Role updated successfully",
        "user_id": str(user_id),
        "old_role": old_role,
        "new_role": body.role.value
    }