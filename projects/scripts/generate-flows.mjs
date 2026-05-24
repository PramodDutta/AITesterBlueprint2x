import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const catalogPath = path.join(rootDir, "catalog", "projects.json");
const n8nDir = path.join(rootDir, "flows", "n8n");
const langflowDir = path.join(rootDir, "flows", "langflow");

function stableId(seed) {
  const hash = createHash("sha1").update(seed).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32)
  ].join("-");
}

function jsString(value) {
  return JSON.stringify(value);
}

function buildPrompt(project) {
  return [
    project.systemPrompt,
    "",
    `Project: ${project.title}`,
    `Objective: ${project.objective}`,
    `Primary use case: ${project.primaryUseCase}`,
    "",
    "Required task:",
    project.taskPrompt,
    "",
    "Required output:",
    "- Start with an executive summary.",
    "- Include assumptions and missing information.",
    "- Provide concrete QA artifacts that can be copied into a real workflow.",
    "- Include an implementation checklist.",
    "- Return Markdown first, then a compact JSON summary."
  ].join("\n");
}

function buildN8n(project) {
  const normalizeCode = `const body = $json.body ?? $json;
return [{
  json: {
    projectId: ${jsString(project.id)},
    title: ${jsString(project.title)},
    provider: body.provider ?? process.env.AIQA_PROVIDER ?? "groq",
    model: body.model ?? process.env.AIQA_MODEL ?? "",
    input: body.input ?? body,
    wrapperUrl: body.wrapperUrl ?? process.env.AIQA_WRAPPER_URL ?? "http://host.docker.internal:8787/api/run"
  }
}];`;

  const shapeCode = `const response = $json;
return [{
  json: {
    projectId: ${jsString(project.id)},
    title: ${jsString(project.title)},
    provider: response.provider ?? "ai-wrapper",
    model: response.model ?? "",
    output: response.output ?? response.content ?? response.message ?? response,
    usage: response.usage ?? null,
    generatedAt: new Date().toISOString()
  }
}];`;

  const workflow = {
    name: `AIQA ${project.kind.toUpperCase()} - ${project.title}`,
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: `aiqa/${project.id}`,
          responseMode: "responseNode",
          options: {}
        },
        id: stableId(`${project.id}:webhook`),
        name: "Project Intake Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [-760, 0],
        webhookId: stableId(`${project.id}:webhook-id`)
      },
      {
        parameters: {
          jsCode: normalizeCode
        },
        id: stableId(`${project.id}:normalize`),
        name: "Normalize AIQA Request",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [-520, 0]
      },
      {
        parameters: {
          method: "POST",
          url: "={{ $json.wrapperUrl }}",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "Content-Type",
                value: "application/json"
              }
            ]
          },
          sendBody: true,
          specifyBody: "json",
          jsonBody: "={{ JSON.stringify({ projectId: $json.projectId, provider: $json.provider, model: $json.model, input: $json.input }) }}",
          options: {
            timeout: 120000
          }
        },
        id: stableId(`${project.id}:wrapper`),
        name: "Call Multi Provider AI Wrapper",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position: [-260, 0]
      },
      {
        parameters: {
          jsCode: shapeCode
        },
        id: stableId(`${project.id}:shape`),
        name: "Shape QA Output",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [0, 0]
      },
      {
        parameters: {
          respondWith: "json",
          responseBody: "={{ $json }}",
          options: {}
        },
        id: stableId(`${project.id}:respond`),
        name: "Return Result",
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.1,
        position: [240, 0]
      }
    ],
    connections: {
      "Project Intake Webhook": {
        main: [[{ node: "Normalize AIQA Request", type: "main", index: 0 }]]
      },
      "Normalize AIQA Request": {
        main: [[{ node: "Call Multi Provider AI Wrapper", type: "main", index: 0 }]]
      },
      "Call Multi Provider AI Wrapper": {
        main: [[{ node: "Shape QA Output", type: "main", index: 0 }]]
      },
      "Shape QA Output": {
        main: [[{ node: "Return Result", type: "main", index: 0 }]]
      }
    },
    pinData: {},
    active: false,
    settings: {
      executionOrder: "v1"
    },
    tags: [
      {
        name: "AI Tester Blueprint 2x"
      },
      {
        name: project.kind
      }
    ],
    meta: {
      projectId: project.id,
      wrapperRequired: true,
      wrapperUrlEnv: "AIQA_WRAPPER_URL",
      samplePayload: {
        provider: "groq",
        input: project.sampleInput
      }
    }
  };

  return workflow;
}

function buildLangFlow(project) {
  const prompt = buildPrompt(project);
  return {
    name: `AIQA ${project.kind.toUpperCase()} - ${project.title}`,
    description: `${project.summary} Uses a prompt template plus configurable chat model. OpenAI-compatible providers can use OpenAI, Groq, OpenRouter, Ollama, or LM Studio base URLs. Anthropic users can swap the chat model component in LangFlow.`,
    metadata: {
      projectId: project.id,
      kind: project.kind,
      category: project.category,
      providerSupport: [
        "OpenAI",
        "Groq via OpenAI-compatible base URL",
        "OpenRouter via OpenAI-compatible base URL",
        "Ollama via local OpenAI-compatible endpoint",
        "LM Studio via local OpenAI-compatible endpoint",
        "Anthropic by replacing the chat model node"
      ],
      sampleInput: project.sampleInput
    },
    nodes: [
      {
        id: "project-input",
        type: "TextInput",
        position: { x: 100, y: 200 },
        data: {
          label: `${project.title} Input`,
          input_type: "textarea",
          value: JSON.stringify(project.sampleInput, null, 2)
        }
      },
      {
        id: "prompt-template",
        type: "PromptTemplate",
        position: { x: 420, y: 200 },
        data: {
          template: `${prompt}\n\nUser input:\n{project_input}`,
          variables: ["project_input"]
        }
      },
      {
        id: "chat-model",
        type: "ChatOpenAI",
        position: { x: 760, y: 200 },
        data: {
          model_name: "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 5000,
          openai_api_base_note: "Set base URL for Groq, OpenRouter, Ollama, or LM Studio when using OpenAI-compatible mode."
        }
      },
      {
        id: "project-output",
        type: "TextOutput",
        position: { x: 1100, y: 200 },
        data: {
          label: `${project.title} Output`
        }
      }
    ],
    edges: [
      { source: "project-input", target: "prompt-template" },
      { source: "prompt-template", target: "chat-model" },
      { source: "chat-model", target: "project-output" }
    ]
  };
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  await mkdir(n8nDir, { recursive: true });
  await mkdir(langflowDir, { recursive: true });

  const index = [];
  for (const project of catalog.projects) {
    const n8nPath = path.join(n8nDir, `${project.id}.json`);
    const langflowPath = path.join(langflowDir, `${project.id}.json`);
    await writeFile(n8nPath, `${JSON.stringify(buildN8n(project), null, 2)}\n`);
    await writeFile(langflowPath, `${JSON.stringify(buildLangFlow(project), null, 2)}\n`);
    index.push({
      id: project.id,
      title: project.title,
      kind: project.kind,
      n8n: `flows/n8n/${project.id}.json`,
      langflow: `flows/langflow/${project.id}.json`
    });
  }

  await writeFile(path.join(rootDir, "flows", "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`Generated ${index.length} n8n flows and ${index.length} LangFlow flows.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
