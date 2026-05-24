const openAICompatibleProviders = {
  groq: {
    baseUrl: () => process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
    apiKey: () => process.env.GROQ_API_KEY,
    model: () => process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    requiresKey: true
  },
  openai: {
    baseUrl: () => process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: () => process.env.OPENAI_API_KEY,
    model: () => process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    requiresKey: true
  },
  chatgpt: {
    baseUrl: () => process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: () => process.env.OPENAI_API_KEY,
    model: () => process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    requiresKey: true
  },
  openrouter: {
    baseUrl: () => process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    apiKey: () => process.env.OPENROUTER_API_KEY,
    model: () => process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
    requiresKey: true
  },
  ollama: {
    baseUrl: () => process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: () => process.env.OLLAMA_API_KEY,
    model: () => process.env.OLLAMA_MODEL ?? "llama3.1",
    requiresKey: false
  },
  lmstudio: {
    baseUrl: () => process.env.LM_STUDIO_BASE_URL ?? "http://localhost:1234/v1",
    apiKey: () => process.env.LM_STUDIO_API_KEY,
    model: () => process.env.LM_STUDIO_MODEL ?? "local-model",
    requiresKey: false
  }
};

function cleanBaseUrl(baseUrl) {
  return baseUrl.replace(/\/$/, "");
}

function extractOpenAIText(data) {
  return (
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    data?.message?.content ??
    data?.response ??
    JSON.stringify(data, null, 2)
  );
}

async function callOpenAICompatible(provider, messages, requestedModel, temperature) {
  const config = openAICompatibleProviders[provider];
  const apiKey = config.apiKey();

  if (config.requiresKey && !apiKey) {
    throw new Error(`${provider.toUpperCase()} API key is missing. Set the matching environment variable in projects/studio/.env.example.`);
  }

  const headers = {
    "Content-Type": "application/json"
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL ?? "http://localhost:5177";
    headers["X-Title"] = process.env.OPENROUTER_APP_TITLE ?? "AI Tester Project Studio";
  }

  const response = await fetch(`${cleanBaseUrl(config.baseUrl())}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: requestedModel || config.model(),
      messages,
      temperature,
      max_tokens: 5000
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${provider} request failed (${response.status}): ${text.slice(0, 1200)}`);
  }

  const data = JSON.parse(text);
  return {
    output: extractOpenAIText(data),
    model: requestedModel || config.model(),
    usage: data.usage ?? null
  };
}

async function callAnthropic(messages, requestedModel, temperature) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing. Set it in your shell or copy projects/studio/.env.example.");
  }

  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  const anthropicMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content
    }));

  const model = requestedModel || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      system,
      messages: anthropicMessages,
      temperature,
      max_tokens: 5000
    })
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`anthropic request failed (${response.status}): ${text.slice(0, 1200)}`);
  }

  const data = JSON.parse(text);
  return {
    output: data.content?.map((block) => block.text ?? "").join("\n") ?? JSON.stringify(data, null, 2),
    model,
    usage: data.usage ?? null
  };
}

export async function callLLM({ provider, messages, model, temperature = 0.2 }) {
  const normalizedProvider = String(provider || "groq").toLowerCase();

  if (normalizedProvider === "anthropic") {
    return callAnthropic(messages, model, temperature);
  }

  if (!openAICompatibleProviders[normalizedProvider]) {
    throw new Error(`Unsupported provider "${provider}".`);
  }

  return callOpenAICompatible(normalizedProvider, messages, model, temperature);
}
