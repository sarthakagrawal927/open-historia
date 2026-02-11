const BRIDGE_URL = process.env.CLI_BRIDGE_URL || "http://localhost:3456";

/**
 * Call the local cli-bridge SSE server and collect the full response.
 * The bridge spawns CLI tools (claude, codex, gemini) locally — no API key needed.
 */
export async function callCliBridge(opts: {
  provider?: string;
  model?: string;
  prompt: string;
  systemPrompt?: string;
}): Promise<string> {
  const { provider = "claude", model, prompt, systemPrompt } = opts;

  const res = await fetch(`${BRIDGE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider,
      model: model || undefined,
      messages: [{ role: "user", content: prompt }],
      systemPrompt: systemPrompt || undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`cli-bridge error (${res.status}): ${body}`);
  }

  // Read SSE stream and collect text chunks
  const reader = res.body?.getReader();
  if (!reader) throw new Error("cli-bridge returned no readable stream");

  const decoder = new TextDecoder();
  let collected = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        if (parsed.text) collected += parsed.text;
        if (parsed.error) throw new Error(parsed.error);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return collected.trim();
}
