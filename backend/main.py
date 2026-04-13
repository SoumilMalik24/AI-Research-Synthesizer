from models.user import User
from models.research import ResearchJob
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.database import engine, Base
from core.config import settings
from routes.auth import router as auth_router
from routes.research import router as research_router
from routes.admin import router as admin_router
import os

# FIX: Ensure sensitive information like API keys is securely stored and not exposed.
# This assumes that settings.LANGCHAIN_API_KEY is securely managed and not hardcoded.
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
os.environ["FRONTEND_URL"] = settings.FRONTEND_URL

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created")
    yield
    await engine.dispose()

app = FastAPI(title="Research Synthesizer API", version="1.0.0", lifespan=lifespan)

# FIX: Specify only the necessary methods and headers in the CORS configuration to enhance security.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Specify only necessary methods
    allow_headers=["Authorization", "Content-Type"],  # Specify only necessary headers
)

app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(research_router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "research-synthesizer"}