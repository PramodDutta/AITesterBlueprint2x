# Chapter 12 — TestCase MCP (FastMCP)

Local MCP server exposing VWO test cases from a CSV so any MCP-compatible LLM client (Claude Desktop, Cursor, Claude Code, MCP Inspector) can search, filter and reason about your test suite.

> Data file: [testcases_vwo_100.csv](testcases_vwo_100.csv) — actually contains **478 rows** (the filename says 100, but more were generated). The server loads whatever rows are in the CSV.

> Background, original prompts, and lesson recap: see [PROMPT.md](PROMPT.md).

## What the server exposes

**Tools (15)**

| Tool | Purpose |
|------|---------|
| `list_test_cases(limit, offset)` | Paginated list (id, summary, priority, module) |
| `get_test_case(id)` | Full record by id (e.g. `TC-00003`) |
| `search_by_priority(priority)` | Filter by P0..P3 |
| `search_by_module(module)` | Filter by module (Reports, Editor, Admin, …) |
| `search_by_label(label)` | Filter by label (smoke, regression, e2e, mobile, …) |
| `search_by_owner(owner)` | Substring match on owner |
| `search_by_status(status)` | Active / Draft / Deprecated |
| `search_by_sprint(sprint)` | e.g. `VWO-25.S38` |
| `search_test_cases(query, priority, module, label, owner, status, limit)` | AND-combined multi-filter + free-text search across summary/steps/expected |
| `list_priorities` / `list_modules` / `list_labels` / `list_owners` | Distinct values for filter discovery |
| `stats()` | Counts by priority, module, status, label |
| `add_test_case(summary, module, ...)` | **Write** — append a new test case; persists to CSV + updates in-memory cache. Auto-generates `TC-00###` id if not provided. |

**Resources**

- `testcases://all` — full dataset
- `testcases://stats` — aggregate counts
- `testcases://{test_case_id}` — single test case by id (template)

**Prompts**

- `review_test_case(test_case_id)` — senior-QA review prompt for a single case
- `suggest_regression_pack(module, max_cases)` — propose a focused regression pack

## Setup

```bash
cd Chapter_12_MCP_Creation
python3 -m venv venv
source venv/bin/activate
pip install fastmcp
```

## Run locally (stdio)

```bash
python tc_mcp.py
```

The server speaks MCP over stdio. It will sit silent waiting for a client.

## Inspect with MCP Inspector

```bash
npx @modelcontextprotocol/inspector \
  $(pwd)/venv/bin/python $(pwd)/tc_mcp.py
```

Inspector opens at `http://127.0.0.1:6274`. Click **Connect**, then browse the **Tools / Resources / Prompts** tabs. Try:

- Tool `stats` → no args
- Tool `search_by_priority` → `priority: P0`
- Tool `search_test_cases` → `query: device, priority: P2, label: regression`
- Tool `add_test_case` → `summary: Verify dark mode toggle, module: Settings, priority: P1, steps: ["open settings","toggle","reload"], labels: ["smoke","ui"]`
- Resource `testcases://TC-00003`
- Prompt `review_test_case` → `test_case_id: TC-00003`

## Connect from Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "testcases": {
      "command": "/absolute/path/to/Chapter_12_MCP_Creation/venv/bin/python",
      "args": ["/absolute/path/to/Chapter_12_MCP_Creation/tc_mcp.py"]
    }
  }
}
```

Restart Claude Desktop. The tools appear in the 🔌 menu.

## Connect from Cursor / Claude Code

`.cursor/mcp.json` (or `.mcp.json` for Claude Code) in the project root:

```json
{
  "mcpServers": {
    "testcases": {
      "command": "venv/bin/python",
      "args": ["tc_mcp.py"],
      "cwd": "Chapter_12_MCP_Creation"
    }
  }
}
```

## Example LLM prompts

- "Give me all P0 test cases in Reports module."
- "Show 10 regression-labelled test cases owned by anyone with 'rao' in name."
- "Review TC-00003 and suggest stronger assertions."
- "Build a smoke regression pack for the Editor module."
- "Add a new test case in the Settings module: verify dark-mode toggle persists across reload."

## CSV schema

```
id, jira_id, summary, module, priority, severity, labels (|-sep),
preconditions, steps (||-sep), expected_result, test_type, owner,
sprint, status
```
