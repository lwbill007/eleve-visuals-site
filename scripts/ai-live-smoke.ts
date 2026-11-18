/**
 * Opt-in live OpenRouter smoke test. This performs one real completion and may
 * consume provider quota, so it is intentionally not part of `npm run verify`.
 */
import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd(), true);

  const { openRouterComplete, probeOpenRouterKey } = await import(
    "../src/lib/ai/providers/openrouter-client"
  );

  const keyProbe = await probeOpenRouterKey();
  if (!keyProbe.ok) {
    console.error("AI live smoke: provider key probe failed");
    process.exit(1);
  }

  const result = await openRouterComplete({
    task: "chat",
    messages: [
      {
        role: "user",
        content: "Reply with exactly: ELEVE_AI_OK",
      },
    ],
    temperature: 0,
    maxTokens: 256,
    validateResponse: (content) => content.trim().includes("ELEVE_AI_OK"),
  });

  const ok = result.finishReason === "stop" && result.content.includes("ELEVE_AI_OK");
  console.info(
    JSON.stringify({
      ok,
      provider: result.provider,
      model: result.model,
      finishReason: result.finishReason,
      nativeFinishReason: result.nativeFinishReason,
      attempts: result.attempts,
      latencyMs: result.latencyMs,
    })
  );

  if (!ok) process.exit(1);
}

void main();
