export type ProjectKind = "agent" | "tool";

export type Provider =
  | "groq"
  | "openai"
  | "chatgpt"
  | "anthropic"
  | "openrouter"
  | "ollama"
  | "lmstudio";

export interface AIProject {
  id: string;
  kind: ProjectKind;
  title: string;
  category: string;
  status: string;
  summary: string;
  objective: string;
  primaryUseCase: string;
  inputs: string[];
  outputs: string[];
  integrations: string[];
  workflow: string[];
  systemPrompt: string;
  taskPrompt: string;
  sampleInput: Record<string, unknown>;
}

export interface Catalog {
  version: string;
  generatedFor: string;
  description: string;
  providerSupport: Provider[];
  projects: AIProject[];
}

export interface RunResponse {
  projectId: string;
  title: string;
  provider: Provider;
  model: string;
  output: string;
  usage?: unknown;
  generatedAt: string;
}
