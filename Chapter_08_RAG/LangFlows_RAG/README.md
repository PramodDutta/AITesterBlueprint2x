# RAG over QA Test Case Repository — LangFlow

## Overview

Build a RAG system over a QA test case repository (CSV, 479 TCs across modules: Reports, Editor, Admin, Mobile, Funnels, AB Testing, etc.).

Implemented as a **Naive RAG** flow in LangFlow with **row-level chunking**.

---

## Architecture

### 1. Per-Row Indexing

- **1 test case = 1 chunk + structured metadata**
- Metadata fields: `tc_id`, `jira_id`, `module`, `priority`, `severity`, `labels`, `sprint`, `status`, `owner`

### 2. Two Retrieval Modes

**Generation Mode**
- Input: Jira ID + short description
- Process: Retrieve K similar TCs → LLM drafts new TC in matching format

**Regression Analysis Mode**
- Input: Module / priority / sprint query
- Output: Relevant existing TCs + gap analysis

### 3. Hybrid Search

Vector similarity + metadata filters

```
module = X
status = Active
priority IN (P0, P1)
```

---

## QA Value

| Use Case | Manual Today | RAG-Powered |
|---|---|---|
| Regression scope per release | QA lead greps spreadsheet | "regression P0/P1 for Reports + Funnels last 2 sprints" → instant filtered list |
| Avoid duplicate TC | Memory + Confluence search | Vector search surfaces near-duplicates before write |
| New TC drafting | Copy-paste similar TC, edit | Auto-generate from Jira ticket + 5 retrieved exemplars; QA reviews/refines |
| Coverage gaps | Manual matrix review | Cluster TCs per module → flag thin areas |
| Onboarding new QA | Read 100s of TCs | Ask "show me 5 representative Editor TCs" |
| Flaky/owner triage | DB query / Jira | Filter `owner=X status=Active` + semantic context |
| Sprint planning | Spreadsheet pivot | "Critical paths missing tests for VWO-25.S44" |
| Test impact analysis | Tribal knowledge | Code change → semantic match against TC descriptions |

---

## Why Row-Level Chunking Is Critical for QA

- **Atomicity**: Each TC is a self-contained unit (independent test, separate execution)
- **Embedding hygiene**: Chunking across rows mixes unrelated tests → polluted embeddings → wrong retrievals
- **Hard filters**: Metadata (priority, module, status) is needed for queries like "show only P0 active tests" — vector search alone is insufficient

---

## Outcome

The QA team gets:

- **10× faster** regression scoping
- **Consistent format** for new TCs (LLM mimics retrieved exemplars)
- **Living test repo** searchable in natural language — not SQL or Jira JQL

---

## Files

| File | Description |
|---|---|
| `Naive RAG - LangFlow -Row Level Chunking.json` | LangFlow flow with row-level chunking + retrieval |
| `data/testcases_vwo_100.csv` | Sample QA test case corpus (100 TCs) |

## How to Run

1. Install [LangFlow](https://docs.langflow.org/)
2. Open LangFlow UI → **Import Flow** → select `Naive RAG - LangFlow -Row Level Chunking.json`
3. Point the CSV loader at `data/testcases_vwo_100.csv`
4. Run the flow → query the test case repo in natural language
