import os
import json
import yaml
import csv
import io
import time
import logging
from typing import List, Optional, Literal, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, Field
from atlassian import Jira
from anthropic import AsyncAnthropic
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-test-generator")

app = FastAPI(title="AI Tester VIBE - Test Case Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LLM Clients (initialized lazily based on available env vars)
anthropic_client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", ""))

# Model defaults per provider
LLM_MODELS = {
    "claude": "claude-3-5-sonnet-20241022",
    "groq": "llama-3.3-70b-versatile",
}

class JiraCredentials(BaseModel):
    url: str
    email: str
    token: str

class JiraIssueRequest(BaseModel):
    credentials: JiraCredentials
    issue_id: str

class TestCase(BaseModel):
    id: str
    title: str
    type: Literal["Positive", "Negative", "Edge", "Boundary", "Security"]
    priority: Literal["P0", "P1", "P2"]
    preconditions: str
    steps: List[str]
    test_data: str
    expected_result: str
    linked_jira_id: str

class GenerateRequest(BaseModel):
    issue_data: Dict[str, Any]
    template_content: str
    provider: Literal["claude", "groq"] = "claude"
    model: Optional[str] = None  # Override default model per provider

class ExportRequest(BaseModel):
    test_cases: List[TestCase]
    format: Literal["md", "csv"]

# ─── Health / Config ───────────────────────────────────────────────

@app.get("/api/providers")
def list_providers():
    """Return which LLM providers are configured on the server."""
    providers = []
    if os.environ.get("ANTHROPIC_API_KEY"):
        providers.append({
            "id": "claude",
            "name": "Claude Sonnet",
            "model": LLM_MODELS["claude"],
            "icon": "sparkles",
        })
    if os.environ.get("GROQ_API_KEY"):
        providers.append({
            "id": "groq",
            "name": "Groq (Llama 3.3 70B)",
            "model": LLM_MODELS["groq"],
            "icon": "zap",
        })
    return {"providers": providers}

# ─── Jira Endpoints ───────────────────────────────────────────────

@app.post("/api/jira/test-connection")
def test_connection(creds: JiraCredentials):
    try:
        jira = Jira(
            url=creds.url,
            username=creds.email,
            password=creds.token
        )
        # Verify connection by fetching the authenticated user profile
        user = jira.myself()
        if not user:
            raise HTTPException(status_code=401, detail="Authentication failed — invalid credentials")
        display_name = user.get("displayName", user.get("name", creds.email))
        return {"status": "success", "message": f"Connected as {display_name}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Jira Connection Error: {str(e)}")

@app.post("/api/jira/fetch-issue")
def fetch_issue(req: JiraIssueRequest):
    try:
        jira = Jira(
            url=req.credentials.url,
            username=req.credentials.email,
            password=req.credentials.token
        )
        issue = jira.issue(req.issue_id)
        
        fields = issue.get("fields", {})
        return {
            "issue_id": req.issue_id,
            "summary": fields.get("summary", ""),
            "description": fields.get("description", ""),
            "issue_type": fields.get("issuetype", {}).get("name", ""),
            "priority": fields.get("priority", {}).get("name", ""),
            "components": [c.get("name") for c in fields.get("components", [])],
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Could not fetch issue {req.issue_id}: {str(e)}")

# ─── LLM Helper Functions ─────────────────────────────────────────

def _clean_llm_json(content: str) -> str:
    """Strip markdown code fences from LLM JSON output."""
    content = content.strip()
    if content.startswith("```json"):
        content = content.split("```json", 1)[1].rsplit("```", 1)[0].strip()
    elif content.startswith("```"):
        content = content.split("```", 1)[1].rsplit("```", 1)[0].strip()
    return content


async def _call_claude(system_prompt: str, user_prompt: str, model: str) -> str:
    """Call Anthropic Claude and return raw text content."""
    response = await anthropic_client.messages.create(
        model=model,
        max_tokens=4000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text


async def _call_groq(system_prompt: str, user_prompt: str, model: str) -> str:
    """Call Groq (OpenAI-compatible) and return raw text content."""
    response = await groq_client.chat.completions.create(
        model=model,
        max_tokens=4000,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
    )
    return response.choices[0].message.content


async def _call_llm(provider: str, system_prompt: str, user_prompt: str, model: Optional[str] = None) -> str:
    """Route to the correct LLM provider and return cleaned text."""
    resolved_model = model or LLM_MODELS.get(provider, LLM_MODELS["claude"])

    if provider == "groq":
        if not os.environ.get("GROQ_API_KEY"):
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on the server")
        return await _call_groq(system_prompt, user_prompt, resolved_model)
    else:  # default: claude
        if not os.environ.get("ANTHROPIC_API_KEY"):
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured on the server")
        return await _call_claude(system_prompt, user_prompt, resolved_model)

# ─── Generate Endpoint ────────────────────────────────────────────

@app.post("/api/testcases/generate")
async def generate_test_cases(req: GenerateRequest):
    start_time = time.time()
    provider = req.provider

    # Parse template
    try:
        template = yaml.safe_load(req.template_content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Template YAML: {str(e)}")

    system_prompt = f"""
You are an expert QA Engineer. Your task is to generate strict structural software test cases based on a Jira User Story/Issue.
You must adhere completely to the provided template guidelines.
Output strictly as a valid JSON array of objects conforming to this schema:
{{
  "id": "TC_001",
  "title": "string",
  "type": "Positive | Negative | Edge | Boundary | Security",
  "priority": "P0 | P1 | P2",
  "preconditions": "string",
  "steps": ["step 1", "step 2"],
  "test_data": "string",
  "expected_result": "string",
  "linked_jira_id": "{req.issue_data.get('issue_id')}"
}}

TEMPLATE SETTINGS:
{json.dumps(template, indent=2)}
"""

    user_prompt = f"""
Please generate a minimum of 5 test cases based on the following Jira issue.
Issue ID: {req.issue_data.get('issue_id')}
Summary: {req.issue_data.get('summary')}
Type: {req.issue_data.get('issue_type')}
Priority: {req.issue_data.get('priority')}
Description:
{req.issue_data.get('description')}

Return ONLY the JSON array.
"""
    try:
        content = await _call_llm(provider, system_prompt, user_prompt, req.model)
        content = _clean_llm_json(content)
        test_cases = json.loads(content)
        
        # Validation
        if not isinstance(test_cases, list):
            raise ValueError("LLM did not return an array")
            
        if len(test_cases) < 5:
            # Retry with a stronger prompt
            retry_prompt = user_prompt + "\n\nIMPORTANT: You must generate AT LEAST 5 test cases. Your previous attempt returned fewer than 5. Generate more diverse test cases including positive, negative, and edge cases."
            retry_content = await _call_llm(provider, system_prompt, retry_prompt, req.model)
            retry_content = _clean_llm_json(retry_content)
            retry_cases = json.loads(retry_content)
            if isinstance(retry_cases, list) and len(retry_cases) >= 5:
                test_cases = retry_cases

        latency = round(time.time() - start_time, 2)
        resolved_model = req.model or LLM_MODELS.get(provider, "unknown")
        
        logger.info(f"Generated {len(test_cases)} test cases | provider={provider} | model={resolved_model} | latency={latency}s")
        
        return {
            "status": "success",
            "latency_seconds": latency,
            "provider": provider,
            "model": resolved_model,
            "test_cases": test_cases
        }
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {str(e)}\nRaw Response: {content}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Generation Error ({provider}): {str(e)}")

# ─── Export Endpoint ───────────────────────────────────────────────

@app.post("/api/testcases/export")
def export_testcases(req: ExportRequest):
    if req.format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Title", "Type", "Priority", "Preconditions", "Steps", "Test Data", "Expected Result", "Linked Jira ID"])
        for tc in req.test_cases:
            writer.writerow([
                tc.id, tc.title, tc.type, tc.priority, tc.preconditions,
                "\n".join(tc.steps), tc.test_data, tc.expected_result, tc.linked_jira_id
            ])
        return Response(content=output.getvalue(), media_type="text/csv")
        
    elif req.format == "md":
        output = "# Generated Test Cases\n\n"
        for tc in req.test_cases:
            output += f"## [{tc.id}] {tc.title}\n"
            output += f"**Type:** {tc.type} | **Priority:** {tc.priority} | **Linked Issue:** {tc.linked_jira_id}\n\n"
            output += f"**Preconditions:** {tc.preconditions}\n\n"
            output += f"**Test Data:** {tc.test_data}\n\n"
            output += "**Steps:**\n"
            for i, step in enumerate(tc.steps, 1):
                output += f"{i}. {step}\n"
            output += f"\n**Expected Result:** {tc.expected_result}\n\n---\n"
            
        return Response(content=output, media_type="text/markdown")
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")
