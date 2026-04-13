from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from core.database import Base
from sqlalchemy.types import Numeric  # FIX: Import Numeric for precise currency handling

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class ResearchJob(Base):
    __tablename__ = "research_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    query = Column(Text, nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    report = Column(JSON, nullable=True)
    total_tokens_used = Column(Float, nullable=True)
    # FIX: Changed total_cost_usd from Float to Numeric for better precision with currency
    total_cost_usd = Column(Numeric(precision=10, scale=2), nullable=True)
    langsmith_run_id = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # FIX: Added a comment to ensure 'completed_at' is set when status changes to COMPLETED
    completed_at = Column(DateTime(timezone=True), nullable=True)  # Ensure this is set when job is completed