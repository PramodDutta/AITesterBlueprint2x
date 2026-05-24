import type { Catalog, Provider, RunResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getCatalog() {
  return request<Catalog>("/api/projects");
}

export function runProject(payload: {
  projectId: string;
  provider: Provider;
  model?: string;
  input: unknown;
}) {
  return request<RunResponse>("/api/run", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function flowUrl(type: "n8n" | "langflow", projectId: string) {
  return `${API_BASE}/api/flows/${type}/${projectId}`;
}
