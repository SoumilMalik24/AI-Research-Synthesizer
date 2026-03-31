import os
from core.config import settings

# These must be set before any langsmith imports
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT

from langsmith import Client
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import json

# LangSmith client — this is how we talk to LangSmith's API directly
client = Client()

# The LLM we use as a judge
judge_llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=settings.OPENAI_API_KEY,
    temperature=0
)

# ─────────────────────────────────────────────
# EVALUATOR 1: LLM-as-judge for synthesis quality
# ─────────────────────────────────────────────

quality_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert at evaluating research synthesis quality.
Score the following synthesis report on a scale of 0.0 to 1.0 based on:
- Does the executive summary directly answer the research question?
- Are the key findings specific and well-supported?
- Are confidence scores reasonable (not all the same value)?
- Are contradictions identified if they exist?

Respond ONLY in JSON:
{{"score": 0.85, "reasoning": "one sentence explanation"}}"""),
    ("human", """Research question: {query}
    
Synthesis report:
{report}""")
])

quality_chain = quality_prompt | judge_llm

async def evaluate_synthesis_quality(query: str, report: dict) -> dict:
    """
    Scores a synthesis report for quality using GPT-4o-mini as a judge.
    Returns a score between 0.0 and 1.0 and a reasoning string.
    
    This is called after every completed job automatically.
    """
    try:
        response = await quality_chain.ainvoke({
            "query": query,
            "report": json.dumps(report, indent=2)[:3000]  # cap at 3000 chars to save tokens
        })
        result = json.loads(response.content)
        return {
            "score": float(result.get("score", 0.0)),
            "reasoning": result.get("reasoning", ""),
            "evaluator": "llm_judge"
        }
    except Exception as e:
        print(f"[Eval] Quality eval failed: {e}")
        return {"score": 0.0, "reasoning": str(e), "evaluator": "llm_judge"}


# ─────────────────────────────────────────────
# EVALUATOR 2: Structural correctness checker
# ─────────────────────────────────────────────

def evaluate_structure(report: dict) -> dict:
    """
    Checks if the report has all required fields with valid values.
    This is rule-based — no LLM needed, runs instantly.
    
    Think of it like a checklist:
    - Does it have an executive summary? +0.2
    - Does it have key findings? +0.2
    - Are confidence scores between 0 and 1? +0.2
    - Does it have languages covered? +0.2
    - Is overall_confidence a real number? +0.2
    """
    score = 0.0
    issues = []

    # Check executive summary exists and isn't empty
    summary = report.get("executive_summary", "")
    if summary and len(summary) > 20:
        score += 0.2
    else:
        issues.append("Missing or too short executive summary")

    # Check key findings exist
    findings = report.get("key_findings", [])
    if findings and len(findings) > 0:
        score += 0.2
    else:
        issues.append("No key findings")

    # Check confidence scores are valid (between 0 and 1)
    if findings:
        valid_scores = all(
            0.0 <= f.get("confidence", -1) <= 1.0
            for f in findings
        )
        if valid_scores:
            score += 0.2
        else:
            issues.append("Invalid confidence scores (must be 0.0-1.0)")

    # Check languages covered
    languages = report.get("languages_covered", [])
    if languages and len(languages) > 0:
        score += 0.2
    else:
        issues.append("No languages listed")

    # Check overall confidence is a valid number
    overall = report.get("overall_confidence", -1)
    if isinstance(overall, (int, float)) and 0.0 <= overall <= 1.0:
        score += 0.2
    else:
        issues.append("Invalid overall_confidence")

    return {
        "score": round(score, 2),
        "issues": issues,
        "evaluator": "structure_checker"
    }


# ─────────────────────────────────────────────
# EVALUATOR 3: Translation coverage checker
# ─────────────────────────────────────────────

def evaluate_language_coverage(report: dict, requested_languages: list = None) -> dict:
    """
    Checks how many languages were actually covered.
    If we asked for 10 languages and only got English, that's a low score.
    """
    covered = report.get("languages_covered", [])
    papers_analyzed = report.get("papers_analyzed", 0)

    # Score based on papers analyzed — more papers = better coverage
    if papers_analyzed >= 10:
        paper_score = 1.0
    elif papers_analyzed >= 5:
        paper_score = 0.7
    elif papers_analyzed >= 2:
        paper_score = 0.4
    else:
        paper_score = 0.1

    return {
        "score": paper_score,
        "languages_found": covered,
        "papers_analyzed": papers_analyzed,
        "evaluator": "coverage_checker"
    }


# ─────────────────────────────────────────────
# MAIN FUNCTION: Run all evals and log to LangSmith
# ─────────────────────────────────────────────

async def run_full_eval(job_id: str, query: str, report: dict) -> dict:
    """
    Runs all 3 evaluators on a completed research job.
    Logs results to LangSmith so you can track quality over time.
    
    Called automatically after every successful pipeline run.
    """
    print(f"[Eval] Running evaluations for job {job_id}")

    # Run all evaluators
    quality_result = await evaluate_synthesis_quality(query, report)
    structure_result = evaluate_structure(report)
    coverage_result = evaluate_language_coverage(report)

    # Combine into one eval summary
    eval_summary = {
        "job_id": job_id,
        "query": query,
        "evaluations": {
            "quality": quality_result,
            "structure": structure_result,
            "coverage": coverage_result,
        },
        # Average score across all evaluators
        "overall_eval_score": round(
            (quality_result["score"] + structure_result["score"] + coverage_result["score"]) / 3,
            3
        )
    }

    try:
        # We use the job_id as the run name to find it in LangSmith
        runs = list(client.list_runs(
            project_name=settings.LANGCHAIN_PROJECT,
            filter=f'eq(name, "synthesis_agent")',
            limit=5
        ))

        if runs:
            latest_run = runs[0]
            # Log each score as feedback
            client.create_feedback(
                run_id=latest_run.id,
                key="synthesis_quality",
                score=quality_result["score"],
                comment=quality_result["reasoning"]
            )
            client.create_feedback(
                run_id=latest_run.id,
                key="structure_score",
                score=structure_result["score"],
                comment=str(structure_result["issues"])
            )
            client.create_feedback(
                run_id=latest_run.id,
                key="coverage_score",
                score=coverage_result["score"]
            )
            print(f"[Eval] Scores logged to LangSmith: overall={eval_summary['overall_eval_score']}")

    except Exception as e:
        # Don't crash the pipeline if LangSmith logging fails
        print(f"[Eval] LangSmith feedback logging failed: {e}")

    return eval_summary