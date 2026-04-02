<div align="center">
  <div style="background-color: #22C55E; width: 64px; height: 64px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flask-conical"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>
  </div>
  
  # ResearchSynth
  
  **An Autonomous Multi-Agent AI System for Academic & Enterprise Research**

  [![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![Celery](https://img.shields.io/badge/Celery-Distributed_Task_Queue-37814A.svg?style=for-the-badge&logo=celery&logoColor=white)](https://docs.celeryq.dev/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Redis](https://img.shields.io/badge/Redis-Job_Broker-DC382D.svg?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

  <p align="center">
    Automate the discovery, translation, and synthesis of complex literature. Submit a query, let the agents work in the background, and receive a comprehensive, structured report with citations.
  </p>
</div>

---

## 📖 Table of Contents
- [Why ResearchSynth?](#-why-researchsynth)
- [How It Works (The Agentic Pipeline)](#-how-it-works-the-agentic-pipeline)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [Local Development Setup](#-local-development-setup)
- [Docker Deployment](#-docker-deployment)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)

---

## ⚡ Why ResearchSynth?

Traditional literature reviews require hours of manual search, reading, translating foreign papers, and synthesizing findings. **ResearchSynth** automates this entirely:

1. **Background Execution**: Research jobs are computationally heavy. The system offloads this to a distributed task queue (Celery + Redis), allowing the frontend to remain snappy while agents work for minutes in the background.
2. **Cross-Lingual Capabilities**: Don't miss out on vital research just because it's in another language. The dedicated Translation Agent standardizes inputs before synthesis.
3. **Structured Outputs**: Instead of raw LLM streams, you get carefully synthesized markdown reports, complete with token usage and cost tracking for LLMOps.
4. **Persistent History**: All research jobs, metadata, and final reports are stored in an async PostgreSQL database for later retrieval and admin monitoring.

---

## 🧠 How It Works (The Agentic Pipeline)

When a user submits a query (e.g., *"Latest advancements in solid-state batteries"*), the backend orchestrates a multi-agent workflow:

![Architecture Diagram](assets/architecture.png)

---

## 🏗️ Architecture & Tech Stack

### Frontend Client
*   **Framework**: React 19 + Vite for bleeding-edge performance.
*   **Styling**: Tailwind CSS 4.0 + custom design tokens.
*   **Routing**: React Router DOM v7.
*   **Icons**: Lucide React.
*   **Auth**: Custom JWT Context + Google OAuth handling.

### Backend API & Workers
*   **Framework**: FastAPI (Asynchronous REST API).
*   **Database ORM**: SQLAlchemy 2.0 with `asyncpg` dialect.
*   **Task Queue**: Celery distributed task queue backed by Redis.
*   **Security**: PyJWT, bcrypt, python-jose.

### Artificial Intelligence
*   **Orchestration**: LangChain, LangGraph, CrewAI.
*   **LLMOps**: LangSmith for tracing and token/cost analytics.
*   **Vector Search**: Pinecone / LanceDB / ChromaDB integrations.
*   **Models**: OpenAI (`gpt-4o` class models).

---

## 📂 Project Structure

```text
Research-Synthesizer/
├── backend/
│   ├── agents/            # Isolated Agent Logic (Search, Translate, Synthesize)
│   ├── core/              # Config, DB connections, Celery app init
│   ├── models/            # SQLAlchemy schemas (User, ResearchJob)
│   ├── routes/            # FastAPI endpoints (auth, jobs, user)
│   ├── schemas/           # Pydantic validation models
│   ├── services/          # Celery tasks (research_service.py)
│   ├── Dockerfile         # API Server Image
│   ├── Dockerfile.worker  # Celery Worker Image
│   ├── requirements.txt   # Python dependencies
│   └── main.py            # Uvicorn entrypoint
│
├── frontend/
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── api/           # Axios interceptors and client wrappers
│   │   ├── components/    # Dumb UI components (Navbar, Loaders)
│   │   ├── context/       # React Context (AuthContext)
│   │   └── pages/         # Smart Route Views (Login, Home, History)
│   ├── package.json       # Node dependencies
│   └── vite.config.js     # Bundler configuration
│
└── docker-compose.yml     # Complete stack orchestrator
```

---

## 💻 Local Development Setup

If you want to run the services bare-metal (without Docker) for active development:

### 1. Prerequisites
*   Node.js v18+
*   Python 3.11+
*   Redis (Must be running locally on port 6379)
*   PostgreSQL (Must be running locally or use a cloud provider like Neon/Supabase)

### 2. Backend Setup
```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your localized .env file (See Environment Variables section)
cp .env.example .env

# Start the FastAPI Server (Port 8000)
uvicorn main:app --reload

# IN A NEW TERMINAL: Start the Celery Worker
cd backend
source .venv/bin/activate
celery -A core.celery_app worker --loglevel=info --pool=solo
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start the Vite dev server (Port 5173 or 3000)
npm run dev
```

---

## 🐳 Docker Deployment (Production / Full Stack)

To spin up the entire architecture (Frontend, Backend API, Celery Worker, and Redis) simultaneously using Docker:

1. Ensure Docker Desktop is running.
2. Populate the `backend/.env` file.
3. Run from the root directory:

```bash
docker-compose up --build -d
```

**Services Exposed:**
*   **Frontend UI**: `http://localhost:80`
*   **FastAPI Backend**: `http://localhost:8000`
*   **Redis**: `localhost:6379` (Internal to docker network)

To view logs for the background worker:
```bash
docker-compose logs -f celery_worker
```

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory. Here is the comprehensive configuration:

```env
# --------------------
# DATABASE & CACHE
# --------------------
# Do not include query params like ?sslmode=require here, the backend handles SSL automatically
DATABASE_URL=postgresql://user:password@host:port/dbname
REDIS_URL=redis://localhost:6379  # Use redis://redis:6379 if running via docker-compose

# --------------------
# SECURITY & AUTH
# --------------------
SECRET_KEY=your_super_secret_jwt_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Google OAuth (For Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# --------------------
# AI & AGENTS
# --------------------
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=pcsk_...
PINECONE_ENV=us-east-1

# --------------------
# LLMOps (LangSmith)
# --------------------
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=research-synthesizer

# --------------------
# FRONTEND CONFIG
# --------------------
FRONTEND_URL=http://localhost:3000
```

---

## 📚 API Documentation

FastAPI automatically generates interactive API documentation. Once the backend is running, you can explore, test endpoints, and view Pydantic schemas at:

*   **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
*   **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

Authentication is required for most endpoints. You can acquire a JWT token via the `/auth/login` endpoint or via the Google OAuth flow and use the "Authorize" button in Swagger.

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<p align="center">
  Built by Soumil Malik, for researchers.
</p>
