"""
TestCase MCP Server (FastMCP)
=============================

Exposes 100 VWO test cases from testcases_vwo_100.csv as MCP tools, resources,
and prompts. Any MCP client (Claude Desktop, Cursor, Inspector) can connect
locally and:

  - list / fetch test cases by id
  - search by priority (P0..P3), module, label, owner, status, sprint
  - free-text search across summary + steps + expected_result
  - get aggregate stats

Run:
    python tc_mcp.py
Inspect:
    npx @modelcontextprotocol/inspector python tc_mcp.py
"""

import csv
import os
from typing import Any

from fastmcp import FastMCP


CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "testcases_vwo_100.csv")


# ----- Data load (once at startup) ------------------------------------------

def _load_test_cases(path: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            r["labels"] = [t for t in r.get("labels", "").split("|") if t]
            r["steps"] = [s.strip() for s in r.get("steps", "").split("||") if s.strip()]
            rows.append(r)
    return rows


TEST_CASES: list[dict[str, Any]] = _load_test_cases(CSV_PATH)
BY_ID: dict[str, dict[str, Any]] = {tc["id"]: tc for tc in TEST_CASES}


# ----- Server ---------------------------------------------------------------

mcp = FastMCP(
    name="TestCaseMCP",
    instructions=(
        "Server exposes 100 VWO test cases. Use list_priorities/list_modules/"
        "list_labels first to discover valid filter values, then call "
        "search_test_cases with filters. Use get_test_case(id) for full "
        "details. Use stats() for an overview."
    ),
)


# ----- Tools ----------------------------------------------------------------

@mcp.tool
def list_test_cases(limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    """Return a page of test cases (id + summary + priority + module)."""
    page = TEST_CASES[offset: offset + limit]
    return [
        {"id": t["id"], "summary": t["summary"], "priority": t["priority"], "module": t["module"]}
        for t in page
    ]


@mcp.tool
def get_test_case(test_case_id: str) -> dict[str, Any]:
    """Return the full test case record for a given id, e.g. 'TC-00003'."""
    tc = BY_ID.get(test_case_id)
    if not tc:
        return {"error": f"test case {test_case_id!r} not found"}
    return tc


@mcp.tool
def search_by_priority(priority: str, limit: int = 50) -> list[dict[str, Any]]:
    """Return test cases matching a priority (P0, P1, P2, P3). Case-insensitive."""
    p = priority.strip().upper()
    return [t for t in TEST_CASES if t["priority"].upper() == p][:limit]


@mcp.tool
def search_by_module(module: str, limit: int = 50) -> list[dict[str, Any]]:
    """Return test cases in a module (Reports, Editor, Admin, etc.). Case-insensitive."""
    m = module.strip().lower()
    return [t for t in TEST_CASES if t["module"].lower() == m][:limit]


@mcp.tool
def search_by_label(label: str, limit: int = 50) -> list[dict[str, Any]]:
    """Return test cases tagged with a label (e.g. smoke, regression, e2e, mobile)."""
    lbl = label.strip().lower()
    return [t for t in TEST_CASES if lbl in [l.lower() for l in t["labels"]]][:limit]


@mcp.tool
def search_by_owner(owner: str, limit: int = 50) -> list[dict[str, Any]]:
    """Return test cases owned by a given user (substring match, case-insensitive)."""
    o = owner.strip().lower()
    return [t for t in TEST_CASES if o in t["owner"].lower()][:limit]


@mcp.tool
def search_by_status(status: str, limit: int = 50) -> list[dict[str, Any]]:
    """Return test cases by status (Active, Draft, Deprecated, ...)."""
    s = status.strip().lower()
    return [t for t in TEST_CASES if t["status"].lower() == s][:limit]


@mcp.tool
def search_by_sprint(sprint: str, limit: int = 50) -> list[dict[str, Any]]:
    """Return test cases in a sprint (e.g. 'VWO-25.S38'). Substring match."""
    sp = sprint.strip().lower()
    return [t for t in TEST_CASES if sp in t["sprint"].lower()][:limit]


@mcp.tool
def search_test_cases(
    query: str = "",
    priority: str = "",
    module: str = "",
    label: str = "",
    owner: str = "",
    status: str = "",
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Multi-filter search.

    All filters are AND-combined. `query` matches summary + steps +
    expected_result (case-insensitive substring). Leave a filter empty to skip.
    """
    q = query.strip().lower()
    p = priority.strip().upper()
    m = module.strip().lower()
    lbl = label.strip().lower()
    o = owner.strip().lower()
    st = status.strip().lower()

    out: list[dict[str, Any]] = []
    for t in TEST_CASES:
        if p and t["priority"].upper() != p:
            continue
        if m and t["module"].lower() != m:
            continue
        if lbl and lbl not in [l.lower() for l in t["labels"]]:
            continue
        if o and o not in t["owner"].lower():
            continue
        if st and t["status"].lower() != st:
            continue
        if q:
            blob = " ".join([
                t.get("summary", ""),
                " ".join(t.get("steps", [])),
                t.get("expected_result", ""),
            ]).lower()
            if q not in blob:
                continue
        out.append(t)
        if len(out) >= limit:
            break
    return out


@mcp.tool
def list_priorities() -> list[str]:
    """Distinct priority values present in dataset."""
    return sorted({t["priority"] for t in TEST_CASES})


@mcp.tool
def list_modules() -> list[str]:
    """Distinct module names."""
    return sorted({t["module"] for t in TEST_CASES})


@mcp.tool
def list_labels() -> list[str]:
    """Distinct labels across all test cases."""
    s: set[str] = set()
    for t in TEST_CASES:
        s.update(t["labels"])
    return sorted(s)


@mcp.tool
def list_owners() -> list[str]:
    """Distinct owners."""
    return sorted({t["owner"] for t in TEST_CASES})


def _compute_stats() -> dict[str, Any]:
    by_priority: dict[str, int] = {}
    by_module: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_label: dict[str, int] = {}
    for t in TEST_CASES:
        by_priority[t["priority"]] = by_priority.get(t["priority"], 0) + 1
        by_module[t["module"]] = by_module.get(t["module"], 0) + 1
        by_status[t["status"]] = by_status.get(t["status"], 0) + 1
        for l in t["labels"]:
            by_label[l] = by_label.get(l, 0) + 1
    return {
        "total": len(TEST_CASES),
        "by_priority": dict(sorted(by_priority.items())),
        "by_module": dict(sorted(by_module.items(), key=lambda x: -x[1])),
        "by_status": dict(sorted(by_status.items(), key=lambda x: -x[1])),
        "by_label": dict(sorted(by_label.items(), key=lambda x: -x[1])),
    }


@mcp.tool
def stats() -> dict[str, Any]:
    """Dataset summary: counts by priority, module, status, label."""
    return _compute_stats()


# ----- Write tool -----------------------------------------------------------

CSV_FIELDS = [
    "id", "jira_id", "summary", "module", "priority", "severity", "labels",
    "preconditions", "steps", "expected_result", "test_type", "owner",
    "sprint", "status",
]


def _next_test_case_id() -> str:
    nums = [int(t["id"].split("-")[1]) for t in TEST_CASES if t["id"].startswith("TC-")]
    next_n = (max(nums) + 1) if nums else 1
    return f"TC-{next_n:05d}"


@mcp.tool
def add_test_case(
    summary: str,
    module: str,
    priority: str = "P2",
    severity: str = "Major",
    expected_result: str = "",
    steps: list[str] | None = None,
    labels: list[str] | None = None,
    preconditions: str = "",
    test_type: str = "Functional",
    owner: str = "unassigned",
    sprint: str = "",
    status: str = "Active",
    jira_id: str = "",
    test_case_id: str = "",
) -> dict[str, Any]:
    """Append a new test case to the CSV + in-memory dataset.

    Only `summary` and `module` are required; everything else defaults.
    If `test_case_id` is empty, an id is auto-generated (TC-00### sequence).
    `steps` is a list of strings; stored joined by '||'. `labels` joined by '|'.
    Returns the created record.
    """
    tc_id = test_case_id.strip() or _next_test_case_id()
    if tc_id in BY_ID:
        return {"error": f"test case id {tc_id} already exists"}

    steps_list = [s.strip() for s in (steps or []) if s and s.strip()]
    labels_list = [l.strip() for l in (labels or []) if l and l.strip()]

    record: dict[str, Any] = {
        "id": tc_id,
        "jira_id": jira_id,
        "summary": summary,
        "module": module,
        "priority": priority.upper(),
        "severity": severity,
        "labels": labels_list,
        "preconditions": preconditions,
        "steps": steps_list,
        "expected_result": expected_result,
        "test_type": test_type,
        "owner": owner,
        "sprint": sprint,
        "status": status,
    }

    csv_row = {
        **record,
        "labels": "|".join(labels_list),
        "steps": "||".join(steps_list),
    }
    write_header = not os.path.exists(CSV_PATH) or os.path.getsize(CSV_PATH) == 0
    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerow({k: csv_row.get(k, "") for k in CSV_FIELDS})

    TEST_CASES.append(record)
    BY_ID[tc_id] = record
    return {"created": True, "test_case": record, "total_now": len(TEST_CASES)}


# ----- Resources ------------------------------------------------------------

@mcp.resource("testcases://all")
def all_test_cases_resource() -> list[dict[str, Any]]:
    """Full dataset as JSON list."""
    return TEST_CASES


@mcp.resource("testcases://stats")
def stats_resource() -> dict[str, Any]:
    """Aggregate stats as a resource (same payload as stats() tool)."""
    return _compute_stats()


@mcp.resource("testcases://{test_case_id}")
def test_case_resource(test_case_id: str) -> dict[str, Any]:
    """Single test case by id, exposed as a resource."""
    return BY_ID.get(test_case_id, {"error": f"{test_case_id} not found"})


# ----- Prompts --------------------------------------------------------------

@mcp.prompt
def review_test_case(test_case_id: str) -> str:
    """Ask the LLM to review a test case for clarity, coverage, assertions."""
    tc = BY_ID.get(test_case_id)
    if not tc:
        return f"Test case {test_case_id} not found."
    return (
        "You are a senior QA reviewer. Review the test case below for clarity, "
        "coverage, and assertion strength. Suggest concrete improvements.\n\n"
        f"ID: {tc['id']}\n"
        f"Summary: {tc['summary']}\n"
        f"Module: {tc['module']}  Priority: {tc['priority']}  Severity: {tc['severity']}\n"
        f"Preconditions: {tc['preconditions']}\n"
        f"Steps:\n  - " + "\n  - ".join(tc["steps"]) + "\n"
        f"Expected: {tc['expected_result']}\n"
    )


@mcp.prompt
def suggest_regression_pack(module: str = "", max_cases: int = 20) -> str:
    """Ask the LLM to propose a focused regression pack from this dataset."""
    scope = f"module '{module}'" if module else "the whole product"
    return (
        f"Using the testcases:// resources, propose a regression pack of up to "
        f"{max_cases} test cases for {scope}. Prefer P0/P1 + smoke/regression "
        "labels. Group by module. Return a markdown table: id | priority | "
        "module | summary."
    )


if __name__ == "__main__":
    mcp.run()
