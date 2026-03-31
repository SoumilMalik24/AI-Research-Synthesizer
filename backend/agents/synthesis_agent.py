from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langsmith import traceable
from core.config import settings
from typing import List, Dict
import json


llm = ChatOpenAI(
    model="gpt-4o",
    api_key=settings.OPENAI_API_KEY,
    temperature=0.3  # slight creativity for writing the report
)

synthesis_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an expert research synthesizer. You will be given multiple academic paper abstracts.
Your job:
1. Identify 3-5 key themes/findings across all papers
2. Detect contradictions between papers
3. Assign confidence scores (0.0-1.0) based on how many papers agree
4. Write an executive summary

Respond ONLY in this exact JSON format:
{{
    "executive_summary": "2-3 sentence overview",
    "key_findings": [
        {{
            "theme": "theme name",
            "summary": "what the papers say about this",
            "supporting_papers": ["paper title 1", "paper title 2"],
            "contradicting_papers": ["paper title 3"],
            "confidence": 0.85
        }}
    ],
    "contradictions_detected": ["description of contradiction 1"],
    "languages_covered": ["en", "zh", "es"],
    "overall_confidence": 0.78
}}"""),
    ("human", """Research question: {query}

Papers to synthesize:
{papers_text}""")
])

synthesis_chain = synthesis_prompt | llm

@traceable(name="synthesis_agent", run_type="chain")
async def run_synthesis_agent(query: str, papers: List[Dict]) -> Dict:
    """
    Reads all translated papers and synthesizes a final structured report.
    """
    
    papers_text = ""
    for i, paper in enumerate(papers[:15]):  
        papers_text += f"""
Paper {i+1}: {paper.get('title', 'Unknown')}
Language: {paper.get('original_language', 'unknown')}
Abstract: {paper.get('abstract_translated', paper.get('abstract', ''))[:800]}
---"""

    try:
        response = await synthesis_chain.ainvoke({
            "query": query,
            "papers_text": papers_text
        })

        # Parse the structured JSON response.
        # LLMs frequently wrap JSON in markdown code fences like ```json ... ```
        # even when told not to. We need to strip those before parsing.
        raw_content = response.content
        report_data = _extract_json(raw_content)

        # Add metadata
        report_data["query"] = query
        report_data["papers_analyzed"] = len(papers)

        token_usage = {}
        if hasattr(response, 'response_metadata'):
            usage = response.response_metadata.get('token_usage', {})
            token_usage = {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
                "estimated_cost_usd": (
                    usage.get("prompt_tokens", 0) * 0.000005 +
                    usage.get("completion_tokens", 0) * 0.000015
                )
            }

        report_data["_token_usage"] = token_usage
        return report_data

    except (json.JSONDecodeError, ValueError) as e:
        print(f"[Synthesis Agent] JSON parse error: {e}")
        print(f"[Synthesis Agent] Raw LLM output:\n{response.content[:1000]}")
        return {
            "query": query,
            "executive_summary": "Synthesis failed — could not parse model output.",
            "key_findings": [],
            "contradictions_detected": [],
            "languages_covered": [],
            "overall_confidence": 0.0,
            "papers_analyzed": len(papers),
            "_token_usage": {}
        }


def _extract_json(text: str) -> dict:
    """
    Extract a JSON object from LLM output that may be wrapped in
    markdown code fences (```json ... ```) or have extra text around it.
    """
    import re

    # Step 1: Strip markdown code fences if present
    # Matches ```json\n...\n``` or ```\n...\n```
    fenced = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()

    # Step 2: Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Step 3: Find the outermost { ... } and try parsing that
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    # Nothing worked
    raise ValueError(f"Could not extract valid JSON from LLM output (length={len(text)})")