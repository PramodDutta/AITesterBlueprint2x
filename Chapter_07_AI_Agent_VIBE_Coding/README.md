# 🧪 AI Test Case Generator from Jira User Stories

A full-stack web application that connects to Jira, fetches a ticket's user story by ID, and auto-generates **≥5 structured test cases** using Claude AI with configurable test templates. Output is copy-ready and exportable.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │Connection│  │  Input   │  │  Context  │  │   Output     │  │
│  │  Panel   │  │  Panel   │  │   Card    │  │   Panel      │  │
│  └────┬─────┘  └────┬─────┘  └───────────┘  └──────┬───────┘  │
│       │              │                              │           │
│       └──────────────┼──────────────────────────────┘           │
│                      │ Axios /api proxy                         │
└──────────────────────┼──────────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────────┐
│                FastAPI Backend                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ /jira/test-    │  │ /jira/fetch-   │  │ /testcases/      │  │
│  │   connection   │  │   issue        │  │   generate       │  │
│  └───────┬────────┘  └───────┬────────┘  └────────┬─────────┘  │
│          │                   │                     │             │
│    Atlassian API       Atlassian API         Anthropic API      │
│                                              (Claude Sonnet)    │
└──────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 |
| **Backend** | Python 3.11 + FastAPI |
| **Jira Client** | `atlassian-python-api` (REST API v3) |
| **LLM** | Claude Sonnet via Anthropic API |
| **Icons** | Lucide React |

## Quick Start

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.11
- Anthropic API Key
- Jira Cloud instance + API Token

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run the server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (proxies /api to backend)
npm run dev
```

Open **http://localhost:5173** in your browser.

### 3. Docker (Backend only)

```bash
cd backend
docker build -t ai-test-generator .
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=your_key ai-test-generator
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude | ✅ |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/jira/test-connection` | Validate Jira credentials |
| POST | `/api/jira/fetch-issue` | Return parsed Jira issue |
| POST | `/api/testcases/generate` | Generate test cases via LLM |
| POST | `/api/testcases/export` | Export test cases as `.md` or `.csv` |

## Test Case Schema

```json
{
  "id": "TC_001",
  "title": "Verify login with valid credentials",
  "type": "Positive",
  "priority": "P0",
  "preconditions": "User has a valid account",
  "steps": ["Navigate to login page", "Enter valid credentials", "Click Login"],
  "test_data": "email: test@example.com, password: Test123!",
  "expected_result": "User is redirected to the dashboard",
  "linked_jira_id": "PROJ-123"
}
```

## Templates

YAML-based templates in `/templates/` define coverage categories, depth, and tone:

| Template | Focus |
|----------|-------|
| `default.yaml` | Comprehensive functional testing |
| `regression.yaml` | Regression-focused coverage |
| `smoke.yaml` | Quick critical path validation |
| `edge.yaml` | Edge/boundary conditions |
| `security.yaml` | Security-focused testing |

## Features

- ✅ **Jira Integration** — Authenticate and fetch any issue by ID
- ✅ **5 Test Templates** — Functional, Regression, Smoke, Edge, Security
- ✅ **Structured Output** — Strict JSON schema with ≥5 test cases
- ✅ **Editable Table** — Inline editing of all generated test case fields
- ✅ **Copy TSV** — One-click clipboard copy for Jira/Xray/TestRail paste
- ✅ **Export Markdown** — Download as `.md` file
- ✅ **Export CSV** — Download as `.csv` file
- ✅ **Secure** — API tokens held in session only, never persisted
- ✅ **Error Handling** — Auth failures, invalid IDs, LLM timeouts
- ✅ **Latency Tracking** — Generation time displayed per request

## Project Structure

```
Chapter_07_AI_Agent_VIBE_Coding/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile          # Container configuration
│   └── .env.example        # Environment template
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # Main application component
│   │   ├── api.ts          # API service layer
│   │   ├── types.ts        # TypeScript type definitions
│   │   ├── index.css       # Design system (Tailwind v4)
│   │   └── components/
│   │       ├── ConnectionPanel.tsx  # Jira auth panel
│   │       ├── InputPanel.tsx       # Issue lookup + template
│   │       ├── ContextCard.tsx      # Parsed issue display
│   │       └── OutputPanel.tsx      # Test case table + export
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── templates/              # YAML test templates
│   ├── default.yaml
│   ├── regression.yaml
│   ├── smoke.yaml
│   ├── edge.yaml
│   └── security.yaml
└── README.md
```

## Design Decisions

1. **Stateless per session** — No database. Credentials and test cases live in browser state only.
2. **Claude Sonnet** — Used as the LLM provider. Configurable via environment.
3. **Copy-paste workflow** — No write-back to Jira. Export as TSV/MD/CSV for flexibility.
4. **Single-user dev tool** — No auth layer. Designed for individual QA engineers.

---

*Part of the AI Tester Blueprint 2x — Chapter 07: AI Agent VIBE Coding*
