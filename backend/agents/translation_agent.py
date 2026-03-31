from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langsmith import traceable
from pinecone import Pinecone, ServerlessSpec
from core.config import settings
from typing import List, Dict
import os
import json
import re

llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=settings.OPENAI_API_KEY,
    temperature=0
)

detect_and_translate_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a multilingual academic translator.
    Given a text, first detect the language, then translate it to English if it's not already English.
    Respond in JSON format only:
    {{
        "detected_language": "language code (e.g. zh, es, fr, en)",
        "translated_text": "english translation or original if already english",
        "confidence": 0.95
    }}"""),
    ("human", "Text to analyze:\n{text}")
])

translate_chain = detect_and_translate_prompt | llm

@traceable(name="translation_agent", run_type="chain")
async def run_translation_agent(papers: List[Dict]) -> List[Dict]:
    """
    Takes raw papers, detects their language, translates abstracts to English.
    Also generates embeddings and stores them in Pinecone.
    """

    pc = Pinecone(api_key=settings.PINECONE_API_KEY)

    index_name = "research-papers"
    if index_name not in [i.name for i in pc.list_indexes()]:
        pc.create_index(
            name=index_name,
            dimension=1536,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )

    index = pc.Index(index_name)
    translated_papers = []

    for i, paper in enumerate(papers):
        try:
            # Skip very short abstracts
            if len(paper["abstract"]) < 50:
                continue

            # Call the translate chain
            response = await translate_chain.ainvoke({"text": paper["abstract"][:2000]})

            # Parse the JSON response from the LLM
            # Strip markdown code fences if the LLM wraps the JSON in ```json ... ```
            result = _extract_json(response.content)

            paper["original_language"] = result.get("detected_language", "unknown")
            paper["abstract_translated"] = result.get("translated_text", paper["abstract"])
            paper["translation_confidence"] = result.get("confidence", 0.0)
            paper["language"] = "en"  # now it's in English

            # Generate embedding for the translated abstract
            # An embedding = a list of 1536 numbers representing the text's meaning
            from langchain_openai import OpenAIEmbeddings
            embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                api_key=settings.OPENAI_API_KEY
            )
            vector = await embeddings.aembed_query(paper["abstract_translated"])

            # Store in Pinecone

            index.upsert(vectors=[{
                "id": f"paper-{i}-{hash(paper['title'])}",
                "values": vector,
                "metadata": {
                    "title": paper["title"][:200],
                    "language": paper["original_language"],
                    "source": paper.get("source", "unknown"),
                }
            }])

            translated_papers.append(paper)

        except Exception as e:
            print(f"[Translation Agent] Error processing paper '{paper.get('title', '')}': {e}")
            # Don't crash the whole pipeline — skip this paper
            continue

    print(f"[Translation Agent] Processed {len(translated_papers)} papers, stored in Pinecone")
    return translated_papers


def _extract_json(text: str) -> dict:
    """
    Extract a JSON object from LLM output that may be wrapped in
    markdown code fences (```json ... ```) or have extra text around it.
    """
    # Step 1: Strip markdown code fences if present
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

    raise ValueError(f"Could not extract valid JSON from LLM output (length={len(text)})")