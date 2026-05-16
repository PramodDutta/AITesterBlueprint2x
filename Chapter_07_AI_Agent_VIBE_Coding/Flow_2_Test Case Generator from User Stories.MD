## Problem Statement

You will get a Jira ticket. Based on the Jira ticket, you need to fetch the content. And after getting the content, you need to generate test cases based on the template which I am going to give you. 

## Template

1.JIRA ID
2.Test Case Template
3.TestCase Generated


Prompt

@contextScopeItemMention 

Build a full-stack web app that connects to Jira, fetches a ticket's user story by ID, and auto-generates a minimum of 5 structured test cases using a configurable test template. Output must be copy-ready and exportable.

## Tech Stack
- **Frontend:** React (Vite + Tailwind CSS)
- **Backend:** Python (FastAPI)
- **Jira client:** REST API v3 via `atlassian-python-api` or raw `httpx`
- **LLM:** Claude Sonnet 4.6 via Anthropic API (configurable)

## Core Flow
1. User enters Jira credentials + Jira ID (e.g., `PROJ-123`) in the dashboard.
2. Backend authenticates and fetches the issue's **summary, description, acceptance criteria, issue type, priority, and linked components**.
3. Parsed user story + selected test template are sent to the LLM with a structured system prompt.
4. LLM returns **≥5 test cases** in a strict JSON schema.
5. Frontend renders test cases in an editable table with copy and export actions.

## Dashboard Requirements
- **Connection panel:** Jira base URL, email, API token (masked). "Test Connection" button with clear success/error feedback.
- **Input panel:** Jira ID field, template selector (Functional / Regression / Smoke / Edge / Security / Custom), "Generate" button with loading + progress states.
- **Context card:** Displays the parsed user story and acceptance criteria so the user can verify what was pulled before generation.
- **Output panel:**
  - Editable table showing all generated test cases
  - **Copy to Clipboard** (TSV format for direct paste into Jira/Xray/TestRail)
  - **Export as Markdown** (`.md` download)
  - **Export as CSV** (`.csv` download)
- Validation: regenerate if fewer than 5 cases returned.

## Test Case Schema (strict)
```json
{
  "id": "TC_001",
  "title": "string",
  "type": "Positive | Negative | Edge | Boundary | Security",
  "priority": "P0 | P1 | P2",
  "preconditions": "string",
  "steps": ["step 1", "step 2"],
  "test_data": "string",
  "expected_result": "string",
  "linked_jira_id": "PROJ-123"
}
```

## Backend Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/jira/test-connection` | Validate credentials |
| POST | `/api/jira/fetch-issue` | Return parsed issue |
| POST | `/api/testcases/generate` | Return generated test cases |
| POST | `/api/testcases/export` | Return `.md` or `.csv` blob |

## Template Format
Templates are YAML files defining coverage categories, depth, and tone. Ship one default; allow custom upload.

## Non-Functional Requirements
- API token held in session only — never persisted server-side.
- Clear error handling: invalid Jira ID, auth failure, empty description, LLM timeout, rate limit.
- Responsive layout for screens ≥1280px.
- Log generation latency and token usage.
- `.env.example` with all required keys.

## Deliverables
1. `/backend` — FastAPI app, `Dockerfile`, `requirements.txt`, `.env.example`
2. `/frontend` — React app with Tailwind, production build
3. `README.md` — setup, env vars, run commands, architecture diagram
4. Sample template files in `/templates`

## Open Questions to Confirm Before Building
1. **LLM provider** — Claude, OpenAI, or local Ollama?
2. **Persistence** — store generated cases in SQLite/Postgres, or stateless per session?
3. **Write-back to Jira/Xray** — auto-create test issues, or copy-paste only?
4. **Multi-user** — single dev tool or team-shared with auth?

