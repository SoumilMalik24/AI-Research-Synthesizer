import httpx
from langchain_openai import ChatOpenAI
from langsmith import traceable
from core.config import settings
from typing import List, Dict
import asyncio
import logging

# FIX: Use Python's logging module instead of print statements for better control over log levels and outputs.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FIX: Define constants for magic numbers to improve maintainability.
ARXIV_RETRIES = 2
ARXIV_INITIAL_TIMEOUT = 45.0
ARXIV_TIMEOUT_INCREMENT = 15.0
SEMANTIC_SCHOLAR_TIMEOUT = 30.0

@traceable(name="search_agent", run_type="chain")
async def run_search_agent(query: str, max_papers: int = 20) -> List[Dict]:
    """
    Searches arXiv and Semantic Scholar for papers related to the query.
    Returns a list of paper dicts with title, abstract, authors, url, language.

    Both sources are fetched independently — if one fails, we still return
    results from the other. This prevents a single slow/down API from
    crashing the entire research pipeline.
    """
    # FIX: Add input validation to check if query is None or empty and handle accordingly.
    if not query:
        raise ValueError("Query must not be None or empty.")

    # FIX: Use asyncio.gather to run _search_arxiv and _search_semantic_scholar concurrently.
    arxiv_task = _search_arxiv(query, max_papers // 2)
    ss_task = _search_semantic_scholar(query, max_papers // 2)
    arxiv_papers, ss_papers = await asyncio.gather(arxiv_task, ss_task)

    papers = arxiv_papers + ss_papers

    if not papers:
        raise ValueError(
            f"No papers found for query '{query}'. "
            "Both arXiv and Semantic Scholar returned zero results or were unreachable."
        )

    logger.info(f"[Search Agent] Found {len(papers)} papers for query: {query}")
    return papers


async def _search_arxiv(query: str, limit: int, retries: int = ARXIV_RETRIES) -> List[Dict]:
    """
    Search arXiv with retries. arXiv's API is notoriously slow and
    frequently times out — we retry with increasing timeouts.
    """
    papers = []
    last_error = None

    for attempt in range(retries + 1):
        # FIX: Use constants for timeout values.
        timeout = ARXIV_INITIAL_TIMEOUT + (attempt * ARXIV_TIMEOUT_INCREMENT)
        try:
            # FIX: Explicitly set verify=True in httpx.AsyncClient to ensure SSL verification.
            async with httpx.AsyncClient(verify=True) as client:
                response = await client.get(
                    "https://export.arxiv.org/api/query",
                    params={
                        "search_query": f"all:{query}",
                        "start": 0,
                        "max_results": limit,
                        "sortBy": "relevance",
                    },
                    timeout=timeout
                )

            arxiv_text = response.text
            entries = arxiv_text.split("<entry>")[1:]

            for entry in entries:
                def extract(tag, _entry=entry):
                    start = _entry.find(f"<{tag}>")
                    end = _entry.find(f"</{tag}>")
                    if start == -1 or end == -1:
                        return ""
                    return _entry[start + len(tag) + 2:end].strip()

                title = extract("title")
                summary = extract("summary")
                if title and summary:
                    papers.append({
                        "title": title,
                        "abstract": summary,
                        "authors": [],
                        "source": "arxiv",
                        "language": "en",
                        "original_language": "en",
                        "source_url": "",
                    })

            logger.info(f"[Search Agent] arXiv returned {len(papers)} papers (attempt {attempt + 1})")
            return papers

        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.TimeoutException) as e:
            last_error = e
            logger.warning(f"[Search Agent] arXiv timeout on attempt {attempt + 1}/{retries + 1} "
                           f"(timeout={timeout}s): {type(e).__name__}")
            if attempt < retries:
                continue  # retry with longer timeout
        except httpx.HTTPError as e:
            last_error = e
            logger.error(f"[Search Agent] arXiv HTTP error: {type(e).__name__}: {e}")
            break  # don't retry on non-timeout HTTP errors
        # FIX: Add a generic exception handler to catch unexpected errors.
        except Exception as e:
            last_error = e
            logger.error(f"[Search Agent] Unexpected error: {type(e).__name__}: {e}")
            break

    logger.error(f"[Search Agent] arXiv failed after {retries + 1} attempts: {type(last_error).__name__}")
    return papers  # return empty list — Semantic Scholar results will still be used


async def _search_semantic_scholar(query: str, limit: int) -> List[Dict]:
    """
    Search Semantic Scholar. Generally faster and more reliable than arXiv.
    """
    papers = []
    try:
        # FIX: Explicitly set verify=True in httpx.AsyncClient to ensure SSL verification.
        async with httpx.AsyncClient(verify=True) as client:
            response = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={
                    "query": query,
                    "limit": limit,
                    "fields": "title,abstract,authors,externalIds,year"
                },
                timeout=SEMANTIC_SCHOLAR_TIMEOUT
            )

        if response.status_code == 429:
            logger.warning("[Search Agent] Semantic Scholar rate limited, skipping")
            return papers

        if response.status_code == 200:
            # FIX: Add a try-except block around response.json() to handle JSON parsing errors.
            try:
                ss_data = response.json()
                for paper in ss_data.get("data", []):
                    if paper.get("abstract"):
                        papers.append({
                            "title": paper.get("title", ""),
                            "abstract": paper.get("abstract", ""),
                            "authors": [a["name"] for a in paper.get("authors", [])],
                            "source": "semantic_scholar",
                            "language": "unknown",
                            "original_language": "unknown",
                            "source_url": f"https://semanticscholar.org/paper/{paper.get('paperId', '')}",
                        })
                logger.info(f"[Search Agent] Semantic Scholar returned {len(papers)} papers")
            except ValueError as e:
                logger.error(f"[Search Agent] Error parsing Semantic Scholar response: {e}")
        else:
            logger.error(f"[Search Agent] Semantic Scholar returned status {response.status_code}")

    except (httpx.TimeoutException, httpx.HTTPError) as e:
        logger.error(f"[Search Agent] Semantic Scholar error: {type(e).__name__}: {e}")

    return papers