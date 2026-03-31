from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from models.research import JobStatus

# What the user sends when submitting a research query
class ResearchQueryRequest(BaseModel):
    query: str
    max_papers: int = 20  
    languages: List[str] = ["en", "zh", "es", "fr", "de", "ar", "ja", "ko", "pt", "ru"]

# What we immediately return (before agents finish)
class JobCreatedResponse(BaseModel):
    job_id: UUID
    status: JobStatus
    message: str

# What a single source paper looks like in the report
class PaperSource(BaseModel):
    title: str
    authors: List[str]
    language: str
    original_language: str      # what language it was in before translation
    abstract_translated: str    # english version
    confidence_score: float     # how confident the synthesis agent is in this paper
    source_url: str

# A finding = one key point extracted across multiple papers
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

# What GET /research/status returns
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

    class Config:
        from_attributes = True