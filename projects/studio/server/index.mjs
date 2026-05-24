import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { callLLM } from "./llmProviders.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(__dirname, "..", "..", "catalog", "projects.json");
const flowsDir = path.resolve(__dirname, "..", "..", "flows");
const port = Number(process.env.PORT ?? 8787);

let catalogCache;

async function loadCatalog() {
  if (!catalogCache) {
    catalogCache = JSON.parse(await readFile(catalogPath, "utf8"));
  }
  return catalogCache;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendText(response, status, text) {
  response.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end(text);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({ text: body });
      }
    });
    request.on("error", reject);
  });
}

function buildMessages(project, input) {
  const userPayload = typeof input === "string" ? input : JSON.stringify(input, null, 2);
  return [
    {
      role: "system",
      content: project.systemPrompt
    },
    {
      role: "user",
      content: [
        `Project: ${project.title}`,
        `Objective: ${project.objective}`,
        `Use case: ${project.primaryUseCase}`,
        "",
        "Task:",
        project.taskPrompt,
        "",
        "Input:",
        userPayload,
        "",
        "Return format:",
        "1. Markdown artifact ready for QA use.",
        "2. Assumptions and missing information.",
        "3. Implementation checklist.",
        "4. Compact JSON summary at the end."
      ].join("\n")
    }
  ];
}

function safeFlowPath(type, projectId) {
  if (!["n8n", "langflow"].includes(type)) {
    return null;
  }

  if (!/^[a-z0-9-]+$/.test(projectId)) {
    return null;
  }

  return path.join(flowsDir, type, `${projectId}.json`);
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 200, { ok: true });
      return;
    }

    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, service: "ai-tester-project-studio" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/projects") {
      sendJson(response, 200, await loadCatalog());
      return;
    }

    const flowMatch = url.pathname.match(/^\/api\/flows\/(n8n|langflow)\/([a-z0-9-]+)$/);
    if (request.method === "GET" && flowMatch) {
      const [, type, projectId] = flowMatch;
      const flowPath = safeFlowPath(type, projectId);
      if (!flowPath) {
        sendText(response, 400, "Invalid flow path");
        return;
      }
      const content = await readFile(flowPath, "utf8");
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Disposition": `inline; filename="${projectId}-${type}.json"`,
        "Access-Control-Allow-Origin": "*"
      });
      response.end(content);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/run") {
      const body = await readBody(request);
      const catalog = await loadCatalog();
      const project = catalog.projects.find((item) => item.id === body.projectId);

      if (!project) {
        sendText(response, 404, `Unknown projectId "${body.projectId}"`);
        return;
      }

      const result = await callLLM({
        provider: body.provider,
        model: body.model,
        temperature: Number(body.temperature ?? 0.2),
        messages: buildMessages(project, body.input ?? {})
      });

      sendJson(response, 200, {
        projectId: project.id,
        title: project.title,
        provider: body.provider ?? "groq",
        model: result.model,
        output: result.output,
        usage: result.usage,
        generatedAt: new Date().toISOString()
      });
      return;
    }

    sendText(response, 404, "Not found");
  } catch (error) {
    sendText(response, 500, error instanceof Error ? error.message : "Unknown server error");
  }
});

server.listen(port, () => {
  console.log(`AI Tester Project Studio API listening on http://localhost:${port}`);
});
