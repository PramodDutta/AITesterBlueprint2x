# Chapter 12 — TestCase MCP: Objective, Data, Prompts

Captures exactly what was asked, what data was used, and the natural-language prompts that drove this MCP server's creation. Useful as a reference for future "build an MCP for X dataset" lessons.

---

## Objective

Build a **local MCP server** using **FastMCP** so any LLM client (Claude Desktop, Cursor, Claude Code, MCP Inspector) can connect over stdio and:

- access ~100 (actually 478) VWO test cases from a CSV
- search them by **priority** (P0…P3)
- search them by **metadata**: module, label, owner, status, sprint
- run free-text search across summary + steps + expected result
- get aggregate **stats**
- **append / create** brand-new test cases that persist to the CSV

Goal: prove that a small, single-file FastMCP server can turn a flat CSV into a fully tool-/resource-/prompt-callable knowledge surface for any LLM.

---

## Data

- File: [`testcases_vwo_100.csv`](testcases_vwo_100.csv)
- Rows: **478** (filename says 100; actual count higher)
- Schema:

```
id, jira_id, summary, module, priority, severity, labels (|-sep),
preconditions, steps (||-sep), expected_result, test_type, owner,
sprint, status
```

- Sample row:

```
TC-00003, VWO-5136, Verify changing user role from Viewer to Admin (p0),
Admin, P0, Blocker, accessibility|e2e|mobile|regression,
User exists Viewer, 1. Edit user || 2. Change role || 3. Save,
Role updated; permissions reload, Functional, sara.patel,
VWO-25.S07, Active
```

---

## Prompts used (verbatim, in order)

### Prompt 1 — initial build request

> Suppose we have the 100 test cases present for us. I want to develop a local MCP by using the power of Fast MCP, where any LLM can connect with this MCP and it can access the 100 test cases which are present. They can search these test cases by their priority, by their metadata also.
>
> Data : testcases_vwo_100.csv , in the chapter _12_mcp creation, please work on it and create an MCP server so that we can connect with this locally. And when you are done, also open the MCP inspector so that I can see the MCP is working.

### Prompt 2 — share connection details

> Please share the MCP information so that I can connect with another LLM.

### Prompt 3 — add a create/append tool

> please create one tool where I can also append or create a new test case in the end.

### Prompt 4 — this file

> can you please put into Chapter 12, MCP creation, whatever the prompt which I have given you to create this MCP? What was the objective, and which data have we taken, and what is the prompt that we have used?

---

## What got built

- **Server file:** [`tc_mcp.py`](tc_mcp.py) (FastMCP, ~280 lines)
- **README:** [`README.md`](README.md) (setup, run, client configs)
- **Venv:** `venv/` with `fastmcp==3.3.1`

### Exposed surface

| Type | Name |
|------|------|
| Tool | `list_test_cases(limit, offset)` |
| Tool | `get_test_case(id)` |
| Tool | `search_by_priority(priority)` |
| Tool | `search_by_module(module)` |
| Tool | `search_by_label(label)` |
| Tool | `search_by_owner(owner)` |
| Tool | `search_by_status(status)` |
| Tool | `search_by_sprint(sprint)` |
| Tool | `search_test_cases(query, priority, module, label, owner, status, limit)` |
| Tool | `list_priorities` / `list_modules` / `list_labels` / `list_owners` |
| Tool | `stats()` |
| Tool | `add_test_case(...)` ← write-back, persists to CSV |
| Resource | `testcases://all` |
| Resource | `testcases://stats` |
| Resource template | `testcases://{test_case_id}` |
| Prompt | `review_test_case(test_case_id)` |
| Prompt | `suggest_regression_pack(module, max_cases)` |

### Run + inspect

```bash
cd Chapter_12_MCP_Creation
source venv/bin/activate
python tc_mcp.py                                  # stdio server
# or — inspect
npx @modelcontextprotocol/inspector \
  ./venv/bin/python ./tc_mcp.py                   # opens http://localhost:6274
```

---

## Lesson recap (for the chapter)

1. **MCP server = thin wrapper around domain data.** Here: a CSV.
2. **FastMCP decorators** (`@mcp.tool`, `@mcp.resource`, `@mcp.prompt`) turn plain Python functions into MCP capabilities — no boilerplate.
3. **Tools** for actions (search, filter, write). **Resources** for browsable read-only data. **Prompts** for reusable LLM instructions.
4. **Local stdio** is the simplest deployment — same config across Claude Desktop / Cursor / Claude Code / Inspector.
5. **Write tools** (`add_test_case`) need extra care: validate inputs, generate ids, persist to source-of-truth, update in-memory cache.
