from pydantic import BaseModel, validator
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from models.research import JobStatus
from pydantic import Field

# FIX: Changed mutable default argument to use default_factory for 'languages'
# This prevents unexpected behavior if the list is modified.
class ResearchQueryRequest(BaseModel):
    query: str
    max_papers: int = 20  
    languages: List[str] = Field(default_factory=lambda: ["en", "zh", "es", "fr", "de", "ar", "ja", "ko", "pt", "ru"])

# FIX: Added UUID validation to ensure 'job_id' is a valid UUID
class JobCreatedResponse(BaseModel):
    job_id: UUID
    status: JobStatus
    message: str

    @validator('job_id')
    def validate_job_id(cls, v):
        if not isinstance(v, UUID):
            raise ValueError('job_id must be a valid UUID')
        return v

# What a single source paper looks like in the report
class PaperSource(BaseModel):
    title: str
    authors: List[str]
    language: str
    original_language: str      # what language it was in before translation
    abstract_translated: str    # english version
    confidence_score: float     # how confident the synthesis agent is in this paper
    source_url: str

# FIX: Note on potential performance issue with large lists
# Consider using a more efficient data structure if performance becomes an issue.
class Finding(BaseModel):
    theme: str
    summary: str
    supporting_papers: List[str]    # paper titles that support this
    contradicting_papers: List[str] # paper titles that contradict this
    confidence: float               # 0.0 to 1.0

# The full structured report
class SynthesisReport(BaseModel):
    query: str
    executive_summary: str
    key_findings: List[Finding]
    contradictions_detected: List[str]
    papers_analyzed: int
    languages_covered: List[str]
    overall_confidence: float

# FIX: Added UUID validation to ensure 'job_id' is a valid UUID
# FIX: Ensure error messages do not expose sensitive information
class JobStatusResponse(BaseModel):
    job_id: UUID
    status: JobStatus
    query: str
    created_at: datetime
    completed_at: Optional[datetime]
    report: Optional[dict] = None
    error_message: Optional[str]

    total_tokens_used: Optional[float]
    total_cost_usd: Optional[float]

    @validator('job_id')
    def validate_job_id(cls, v):
        if not isinstance(v, UUID):
            raise ValueError('job_id must be a valid UUID')
        return v

    @validator('error_message', pre=True, always=True)
    def sanitize_error_message(cls, v):
        # Ensure that error messages do not expose sensitive information
        if v:
            return "An error occurred. Please contact support."
        return v

    class Config:
        from_attributes = True