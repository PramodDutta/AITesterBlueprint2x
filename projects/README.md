# AI Tester Blueprint 2x Projects

This branch folder contains a project-ready portfolio of 10 AI testing agents and 3 AI testing tools. Each project includes:

- Importable n8n workflow JSON
- Importable LangFlow JSON
- A React studio app for running the same project through a shared LLM wrapper
- Provider support for Groq, OpenAI/ChatGPT, Anthropic, OpenRouter, Ollama, and LM Studio

## Selected AI Agents

1. Test Strategy Builder Agent
2. Test Case Creator Agent
3. Test Data Builder Agent
4. Selenium to Playwright Converter
5. API Code Generator Agent
6. Accessibility Auditor Agent
7. Chrome Recorder Agent
8. Self-Healing Automation Agent
9. Flaky Test Detector Agent
10. Release Readiness Agent

## Selected AI Testing Tools

1. AI Test Case Generator
2. DOM and Screenshot UI Test Generator
3. AI Bug Triage and Root Cause Analyzer

## Folder Map

```text
projects/
  catalog/projects.json          # Single source of truth for the 13 projects
  flows/index.json               # Flow manifest
  flows/n8n/*.json               # n8n imports, one per project
  flows/langflow/*.json          # LangFlow imports, one per project
  scripts/generate-flows.mjs     # Rebuilds all workflow JSON from the catalog
  studio/                        # React app plus Node LLM wrapper
```

## Run The React Studio

```bash
cd projects/studio
npm install
cp .env.example .env
npm run dev:all
```

Open:

```text
http://localhost:5177
```

The API wrapper runs on:

```text
http://localhost:8787
```

## Provider Environment

Cloud providers need API keys:

```bash
export GROQ_API_KEY="..."
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export OPENROUTER_API_KEY="..."
```

Local providers need their server running:

```bash
# Ollama OpenAI-compatible endpoint
ollama serve
ollama pull llama3.1

# LM Studio
# Start the local OpenAI-compatible server on http://localhost:1234/v1
```

## API Usage

```bash
curl -X POST http://localhost:8787/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-strategy-builder",
    "provider": "groq",
    "input": {
      "projectName": "Fintech onboarding revamp",
      "techStack": "React, Node.js, PostgreSQL",
      "timeline": "4 weeks"
    }
  }'
```

## n8n Usage

1. Start the wrapper with `npm run api` or `npm run dev:all`.
2. Import any file from `projects/flows/n8n`.
3. Set `AIQA_WRAPPER_URL` in n8n if the wrapper is not reachable at `http://host.docker.internal:8787/api/run`.
4. Call the workflow webhook with:

```json
{
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "input": {
    "projectName": "Checkout revamp",
    "risks": "payment failures, coupon abuse"
  }
}
```

## LangFlow Usage

Import any file from `projects/flows/langflow`. The generated flows use a prompt template plus a chat model node. For OpenAI-compatible providers, set the base URL and key in the LangFlow chat model:

- Groq: `https://api.groq.com/openai/v1`
- OpenRouter: `https://openrouter.ai/api/v1`
- Ollama: `http://localhost:11434/v1`
- LM Studio: `http://localhost:1234/v1`

For Anthropic, replace the chat model node with the Anthropic chat component in LangFlow and keep the same prompt template.

## Regenerate Flows

After editing `catalog/projects.json`:

```bash
node projects/scripts/generate-flows.mjs
```
