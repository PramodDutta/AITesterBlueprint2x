from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'tools'))
from tools.jira_client import JiraClient
from tools.llm_client import LLMClient
from tools.document_generator import DocumentGenerator
from tools.test_jira_connection import test_jira_connection
from tools.test_llm_connection import test_llm_connection

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class JiraConnectionReq(BaseModel):
    url: str
    email: str
    token: str

class LLMConnectionReq(BaseModel):
    provider: str
    url: str
    key: str
    model: str

class GenerateReq(BaseModel):
    jira: JiraConnectionReq
    llm: LLMConnectionReq
    ticket_id: str
    context: str

@app.post("/api/test-jira")
def api_test_jira(req: JiraConnectionReq):
    success = test_jira_connection(req.url, req.email, req.token)
    if success:
        return {"status": "success", "message": "Jira connected successfully"}
    raise HTTPException(status_code=400, detail="Failed to connect to Jira")

@app.post("/api/test-llm")
def api_test_llm(req: LLMConnectionReq):
    success = test_llm_connection(req.provider, req.url, req.key, req.model)
    if success:
        return {"status": "success", "message": f"{req.provider} connected successfully"}
    raise HTTPException(status_code=400, detail=f"Failed to connect to {req.provider}")

@app.post("/api/generate")
def api_generate(req: GenerateReq):
    # Step 1: Fetch Ticket
    client = JiraClient(req.jira.url, req.jira.email, req.jira.token)
    ticket_data = client.fetch_ticket(req.ticket_id)
    
    if ticket_data.get("error"):
        raise HTTPException(status_code=400, detail=ticket_data.get("message"))
    
    # Step 2: Generate via LLM
    llm = LLMClient(req.llm.provider, req.llm.url, req.llm.key, req.llm.model)
    llm_res = llm.generate_test_plan(ticket_data, req.context)
    
    if llm_res.get("error"):
        raise HTTPException(status_code=500, detail=llm_res.get("message"))
        
    markdown_content = llm_res.get("markdown")
    
    # Step 3: Save File
    doc_gen = DocumentGenerator()
    save_res = doc_gen.save_markdown(f"{req.ticket_id}_TestPlan", markdown_content)
    
    if save_res.get("error"):
        raise HTTPException(status_code=500, detail=save_res.get("message"))
        
    return {
        "status": "success",
        "message": "Test plan generated",
        "markdown": markdown_content,
        "file_path": save_res.get("file_path")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
