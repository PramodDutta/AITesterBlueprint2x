import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  Download,
  FileJson,
  GitBranch,
  Play,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react";
import { flowUrl, getCatalog, runProject } from "./api";
import type { AIProject, Catalog, ProjectKind, Provider, RunResponse } from "./types";

const providerLabels: Record<Provider, string> = {
  groq: "Groq",
  openai: "OpenAI",
  chatgpt: "ChatGPT",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  ollama: "Ollama",
  lmstudio: "LM Studio"
};

const defaultModels: Record<Provider, string> = {
  groq: "llama-3.3-70b-versatile",
  openai: "gpt-4o-mini",
  chatgpt: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  openrouter: "openai/gpt-4o-mini",
  ollama: "llama3.1",
  lmstudio: "local-model"
};

type KindFilter = "all" | ProjectKind;

function parseInput(input: string) {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return { text: input };
  }
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<Provider>("groq");
  const [model, setModel] = useState(defaultModels.groq);
  const [inputValue, setInputValue] = useState("");
  const [output, setOutput] = useState<RunResponse | null>(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState<"output" | "curl" | null>(null);

  useEffect(() => {
    getCatalog()
      .then((data) => {
        setCatalog(data);
        const firstProject = data.projects[0];
        if (firstProject) {
          setSelectedId(firstProject.id);
          setInputValue(formatJson(firstProject.sampleInput));
        }
      })
      .catch((loadError: Error) => setError(loadError.message));
  }, []);

  const projects = catalog?.projects ?? [];
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? projects[0],
    [projects, selectedId]
  );

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesKind = kindFilter === "all" || project.kind === kindFilter;
      const matchesSearch =
        !query ||
        project.title.toLowerCase().includes(query) ||
        project.category.toLowerCase().includes(query) ||
        project.summary.toLowerCase().includes(query);
      return matchesKind && matchesSearch;
    });
  }, [kindFilter, projects, search]);

  const counts = useMemo(
    () => ({
      agents: projects.filter((project) => project.kind === "agent").length,
      tools: projects.filter((project) => project.kind === "tool").length,
      flows: projects.length * 2
    }),
    [projects]
  );

  useEffect(() => {
    setModel(defaultModels[provider]);
  }, [provider]);

  function chooseProject(project: AIProject) {
    setSelectedId(project.id);
    setInputValue(formatJson(project.sampleInput));
    setOutput(null);
    setError("");
  }

  async function handleRun() {
    if (!selectedProject) return;
    setIsRunning(true);
    setError("");
    setOutput(null);

    try {
      const result = await runProject({
        projectId: selectedProject.id,
        provider,
        model,
        input: parseInput(inputValue)
      });
      setOutput(result);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Unknown run failure");
    } finally {
      setIsRunning(false);
    }
  }

  async function copyText(kind: "output" | "curl", text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1400);
  }

  const curlCommand =
    selectedProject &&
    `curl -X POST http://localhost:8787/api/run -H "Content-Type: application/json" -d '${JSON.stringify({
      projectId: selectedProject.id,
      provider,
      model,
      input: parseInput(inputValue)
    })}'`;

  if (!catalog || !selectedProject) {
    return (
      <main className="loading-screen">
        <Server className="spin" size={26} />
        <span>Loading AI Tester Project Studio</span>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI Tester Blueprint 2x</p>
          <h1>Project Studio</h1>
        </div>
        <div className="stat-strip" aria-label="Project counts">
          <span>{counts.agents} agents</span>
          <span>{counts.tools} tools</span>
          <span>{counts.flows} flows</span>
        </div>
      </header>

      <section className="layout">
        <aside className="sidebar">
          <div className="search-box">
            <Search size={17} />
            <input
              aria-label="Search projects"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
            />
          </div>

          <div className="segmented" aria-label="Project type filter">
            {(["all", "agent", "tool"] as KindFilter[]).map((kind) => (
              <button
                key={kind}
                type="button"
                className={kindFilter === kind ? "active" : ""}
                onClick={() => setKindFilter(kind)}
              >
                {kind}
              </button>
            ))}
          </div>

          <div className="project-list">
            {visibleProjects.map((project) => {
              const Icon = project.kind === "agent" ? Bot : Wrench;
              return (
                <button
                  className={`project-row ${selectedProject.id === project.id ? "selected" : ""}`}
                  key={project.id}
                  type="button"
                  onClick={() => chooseProject(project)}
                >
                  <Icon size={18} />
                  <span>
                    <strong>{project.title}</strong>
                    <small>{project.category}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="workspace">
          <div className="project-header">
            <div>
              <span className={`kind-pill ${selectedProject.kind}`}>{selectedProject.kind}</span>
              <h2>{selectedProject.title}</h2>
              <p>{selectedProject.summary}</p>
            </div>
            <div className="flow-actions">
              <a href={flowUrl("n8n", selectedProject.id)} target="_blank" rel="noreferrer">
                <Download size={17} />
                n8n
              </a>
              <a href={flowUrl("langflow", selectedProject.id)} target="_blank" rel="noreferrer">
                <GitBranch size={17} />
                LangFlow
              </a>
            </div>
          </div>

          <div className="content-grid">
            <section className="panel run-panel">
              <div className="panel-title">
                <Sparkles size={18} />
                <h3>Run</h3>
              </div>

              <div className="controls">
                <label>
                  Provider
                  <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)}>
                    {catalog.providerSupport.map((item) => (
                      <option value={item} key={item}>
                        {providerLabels[item]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Model
                  <input value={model} onChange={(event) => setModel(event.target.value)} />
                </label>
              </div>

              <label className="input-editor">
                Input JSON
                <textarea value={inputValue} onChange={(event) => setInputValue(event.target.value)} />
              </label>

              <div className="button-row">
                <button className="primary-action" type="button" onClick={handleRun} disabled={isRunning}>
                  <Play size={18} />
                  {isRunning ? "Running" : "Run"}
                </button>
                {curlCommand && (
                  <button className="ghost-action" type="button" onClick={() => copyText("curl", curlCommand)}>
                    {copied === "curl" ? <Check size={18} /> : <Copy size={18} />}
                    cURL
                  </button>
                )}
              </div>

              {error && <pre className="error-output">{error}</pre>}
            </section>

            <section className="panel output-panel">
              <div className="panel-title">
                <FileJson size={18} />
                <h3>Output</h3>
                {output && (
                  <button type="button" onClick={() => copyText("output", output.output)}>
                    {copied === "output" ? <Check size={17} /> : <Copy size={17} />}
                  </button>
                )}
              </div>
              <pre>{output?.output ?? "Run the selected project to generate a QA artifact."}</pre>
            </section>
          </div>

          <section className="details-grid">
            <div className="detail-band">
              <div className="detail-title">
                <ShieldCheck size={18} />
                <h3>Objective</h3>
              </div>
              <p>{selectedProject.objective}</p>
            </div>
            <div className="detail-band">
              <h3>Workflow</h3>
              <ol>
                {selectedProject.workflow.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <div className="detail-band split">
              <div>
                <h3>Inputs</h3>
                <ul>
                  {selectedProject.inputs.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Outputs</h3>
                <ul>
                  {selectedProject.outputs.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

export default App;
