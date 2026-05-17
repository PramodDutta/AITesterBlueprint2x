import json
from fastmcp import FastMCP

mcp = FastMCP(name="DataServer")


# ---------- Resources ----------
@mcp.resource("resource://greeting")
def get_greeting() -> str:
    """Provides a simple greeting message."""
    return "Hello from FastMCP Resources!"


@mcp.resource("data://config")
def get_config() -> str:
    """Provides application configuration as JSON."""
    return json.dumps({
        "theme": "dark",
        "version": "1.2.0",
        "features": ["tools", "resources", "prompts"],
    })


@mcp.resource("data://user/{user_id}")
def get_user(user_id: str) -> str:
    """Dynamic resource — return a fake user record by id."""
    return json.dumps({"id": user_id, "name": f"User {user_id}", "role": "tester"})


# ---------- Tool ----------
@mcp.tool
def add(a: int, b: int) -> int:
    """Add two integers and return the sum."""
    return a + b


# ---------- Prompts ----------
@mcp.prompt
def review_test_case(test_case: str) -> str:
    """Prompt template that asks the model to review a QA test case."""
    return (
        "You are a senior QA reviewer. Review the test case below for clarity, "
        "coverage and assertion strength. Suggest improvements.\n\n"
        f"Test case:\n{test_case}"
    )


@mcp.prompt
def summarize_config() -> str:
    """Prompt template that asks the model to summarize the server config resource."""
    return "Fetch the resource data://config and summarize each field in one line."


if __name__ == "__main__":
    mcp.run()
