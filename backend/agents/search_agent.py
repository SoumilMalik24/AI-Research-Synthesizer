import httpx
from langchain_openai import ChatOpenAI
from langsmith import traceable
from core.config import settings
from typing import List, Dict

@traceable(name="search_agent", run_type="chain")
async def run_search_agent(query:str, max_papers:int = 20) -> List[Dict]:
    """
    Searches arXiv and Semantic Scholar for papers related to the query.
    Returns a list of paper dicts with title, abstract, authors, url, language.

    Both sources are fetched independently — if one fails, we still return
    results from the other. This prevents a single slow/down API from
    crashing the entire research pipeline.
    """
    papers = []

    # --- arXiv ---
    arxiv_papers = await _search_arxiv(query, max_papers // 2)
    papers.extend(arxiv_papers)

    # --- Semantic Scholar ---
    ss_papers = await _search_semantic_scholar(query, max_papers // 2)
    papers.extend(ss_papers)

    if not papers:
        raise ValueError(
            f"No papers found for query '{query}'. "
            "Both arXiv and Semantic Scholar returned zero results or were unreachable."
        )

    print(f"[Search Agent] Found {len(papers)} papers for query: {query}")
    return papers


async def _search_arxiv(query: str, limit: int, retries: int = 2) -> List[Dict]:
    """
    Search arXiv with retries. arXiv's API is notoriously slow and
    frequently times out — we retry with increasing timeouts.
    """
    papers = []
    last_error = None

    for attempt in range(retries + 1):
        # Increase timeout on each retry: 45s, 60s, 90s
        timeout = 45.0 + (attempt * 15.0)
        try:
            async with httpx.AsyncClient() as client:
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

            print(f"[Search Agent] arXiv returned {len(papers)} papers (attempt {attempt + 1})")
            return papers

        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.TimeoutException) as e:
            last_error = e
            print(f"[Search Agent] arXiv timeout on attempt {attempt + 1}/{retries + 1} "
                  f"(timeout={timeout}s): {type(e).__name__}")
            if attempt < retries:
                continue  # retry with longer timeout
        except httpx.HTTPError as e:
            last_error = e
            print(f"[Search Agent] arXiv HTTP error: {type(e).__name__}: {e}")
            break  # don't retry on non-timeout HTTP errors

    print(f"[Search Agent] arXiv failed after {retries + 1} attempts: {type(last_error).__name__}")
    return papers  # return empty list — Semantic Scholar results will still be used


async def _search_semantic_scholar(query: str, limit: int) -> List[Dict]:
    """
    Search Semantic Scholar. Generally faster and more reliable than arXiv.
    """
    papers = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={
                    "query": query,
                    "limit": limit,
                    "fields": "title,abstract,authors,externalIds,year"
                },
                timeout=30.0
            )

        if response.status_code == 429:
            print("[Search Agent] Semantic Scholar rate limited, skipping")
            return papers

        if response.status_code == 200:
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
            print(f"[Search Agent] Semantic Scholar returned {len(papers)} papers")
        else:
            print(f"[Search Agent] Semantic Scholar returned status {response.status_code}")

    except (httpx.TimeoutException, httpx.HTTPError) as e:
        print(f"[Search Agent] Semantic Scholar error: {type(e).__name__}: {e}")

    return papers