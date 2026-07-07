import { getAIConfig, isAIConfigured } from "./config";
import { aiComplete, aiStream, getActiveProviderLabel } from "./adapter";
import { isOpenRouterConfigured, probeOpenRouterKey } from "./providers/openrouter-client";
import { buildMemoryContext } from "./memory";
import { logAIAction } from "./log";
import { systemPromptForTask, TASK_PROMPTS } from "./prompts/system";
import { BUSINESS_TOOLS, buildBusinessContextSnapshot, executeBusinessTool } from "./tools/business-data";
import { formatDecisionContextForPrompt, buildDecisionEngineContext } from "./executive/decision-engine";
import { getAdminInsights } from "@/lib/admin-os-server";
import type { AIGenerateRequest, AIMessage, AIStreamChunk } from "./types";

export async function runAIChat(
  userMessage: string,
  history: AIMessage[] = [],
  options?: { role?: string }
): Promise<{ content: string; provider: string }> {
  if (!isAIConfigured()) {
    return { content: await fallbackChatResponse(userMessage), provider: "rules" };
  }

  const { resolveAgent, buildAgentSystemMessages } = await import("./executive/agents");
  const agent = resolveAgent(options?.role);
  const ragContext = await buildMemoryContext(userMessage, "executive");
  const decisionCtx = await buildDecisionEngineContext(userMessage);
  const agentMessages = buildAgentSystemMessages(agent, [
    formatDecisionContextForPrompt(decisionCtx),
    `Structured business memories:\n${ragContext}`,
  ]);

  const messages: AIMessage[] = [
    ...agentMessages,
    ...history.slice(-10),
    { role: "user", content: userMessage },
  ];

  const config = getAIConfig();
  let iterations = 0;

  while (iterations < config.maxToolIterations) {
    iterations += 1;
    const result = await aiComplete({ messages, tools: BUSINESS_TOOLS });

    if (!result || result.finishReason === "error" || !result.toolCalls?.length) {
      await logAIAction("ai_chat", "assistant", userMessage.slice(0, 200));
      return {
        content: result?.content || "I couldn't generate a response. Please try again.",
        provider: result?.provider ?? getActiveProviderLabel(),
      };
    }

    messages.push({ role: "assistant", content: result.content || "Calling tools…" });

    for (const call of result.toolCalls) {
      const toolResult = await executeBusinessTool(call.name, call.arguments);
      messages.push({ role: "tool", toolName: call.name, content: toolResult });
    }
  }

  const final = await aiComplete({ messages });
  await logAIAction("ai_chat", "assistant", userMessage.slice(0, 200));
  return {
    content: final?.content || "I couldn't complete that request.",
    provider: final?.provider ?? getActiveProviderLabel(),
  };
}

export async function* streamAIChat(
  userMessage: string,
  history: AIMessage[] = [],
  options?: { role?: string }
): AsyncGenerator<AIStreamChunk> {
  if (!isAIConfigured()) {
    const fallback = await fallbackChatResponse(userMessage);
    yield { type: "text", text: fallback };
    yield { type: "done" };
    return;
  }

  const { resolveAgent, buildAgentSystemMessages } = await import("./executive/agents");
  const agent = resolveAgent(options?.role);

  const snapshot = await buildBusinessContextSnapshot();
  const ragContext = await buildMemoryContext(userMessage, "executive");
  const decisionCtx = await buildDecisionEngineContext(userMessage);
  const executiveContext = formatDecisionContextForPrompt(decisionCtx);
  const agentMessages = buildAgentSystemMessages(agent, [
    executiveContext,
    `Structured business memories (RAG):\n${ragContext}`,
    `Live business snapshot:\n${snapshot}`,
  ]);
  const messages: AIMessage[] = [
    ...agentMessages,
    ...history.slice(-8),
    { role: "user", content: userMessage },
  ];

  let streamedText = false;
  for await (const chunk of aiStream({ messages })) {
    if (chunk.type === "text" && chunk.text) streamedText = true;
    if (chunk.type === "error" && !streamedText) {
      const probe = isOpenRouterConfigured() ? await probeOpenRouterKey() : null;
      const fallback = await fallbackChatResponse(
        userMessage,
        !isAIConfigured() ? "missing_key" : probe && !probe.ok ? "invalid_key" : "unavailable"
      );
      yield { type: "text", text: fallback };
      yield { type: "done" };
      await logAIAction("ai_chat_stream_fallback", "assistant", userMessage.slice(0, 200));
      return;
    }
    yield chunk;
  }

  await logAIAction("ai_chat_stream", "assistant", userMessage.slice(0, 200));
}

export async function generateAIContent(
  request: AIGenerateRequest
): Promise<{ content: string; provider: string; ok: boolean; reason?: string }> {
  const taskPrompt = TASK_PROMPTS[request.task] || TASK_PROMPTS.general;
  const contextStr = request.context ? `\nContext:\n${JSON.stringify(request.context, null, 2)}` : "";

  if (!isAIConfigured()) {
    return {
      content: "",
      provider: "none",
      ok: false,
      reason: "AI provider not configured. Set OPENROUTER_API_KEY (or OLLAMA_BASE_URL) to enable generation.",
    };
  }

  let result: Awaited<ReturnType<typeof aiComplete>> = null;
  try {
    result = await aiComplete({
      messages: [
        { role: "system", content: systemPromptForTask(taskPrompt) },
        { role: "user", content: `${request.prompt}${contextStr}` },
      ],
      temperature: 0.8,
    });
  } catch (err) {
    await logAIAction("ai_generate_error", request.task, err instanceof Error ? err.message : "unknown");
    result = null;
  }

  await logAIAction("ai_generate", request.task, request.prompt.slice(0, 200));

  if (!result?.content) {
    // Explain WHY, per truth-layer principle — never a dead-end failure.
    let reason = "All AI models were unavailable or returned no content.";
    if (isOpenRouterConfigured()) {
      const probe = await probeOpenRouterKey().catch(() => ({ ok: true as const }));
      if (!probe.ok && probe.error) reason = probe.error;
      else reason = "OpenRouter accepted the key but every model in the chain failed or timed out. Try again in a moment.";
    }
    return { content: "", provider: result?.provider ?? "none", ok: false, reason };
  }

  return { content: result.content, provider: result.provider, ok: true };
}

export async function aiNaturalLanguageSearch(query: string): Promise<{
  interpretation: string;
  results: { label: string; href: string; category: string }[];
  provider: string;
}> {
  const q = query.toLowerCase();

  if (q.includes("inactive") || q.includes("hasn't booked") || q.includes("6 month")) {
    const tool = await executeBusinessTool("get_inactive_clients", { days: 180 });
    const parsed = JSON.parse(tool) as { clients: { name: string; email: string }[] };
    return {
      interpretation: "Clients inactive 180+ days",
      results: parsed.clients.map((c) => ({
        label: c.name || c.email,
        href: "/admin/crm",
        category: "CRM",
      })),
      provider: "rules",
    };
  }

  if (q.includes("instagram") || q.includes("booking source")) {
    await executeBusinessTool("get_business_snapshot", {});
    return {
      interpretation: "Lead sources from booking data",
      results: [{ label: "View analytics", href: "/admin/analytics", category: "Analytics" }],
      provider: "rules",
    };
  }

  if (q.includes("vol") || q.includes("session") || q.includes("application")) {
    return {
      interpretation: "ÉLEVÉ Sessions applications",
      results: [{ label: "Open applications", href: "/admin/applications", category: "Sessions" }],
      provider: "rules",
    };
  }

  const search = await executeBusinessTool("search_business", { query });
  const parsed = JSON.parse(search) as { results: { label: string; href: string; category: string }[] };
  return {
    interpretation: `Search: "${query}"`,
    results: parsed.results ?? [],
    provider: "rules",
  };
}

type FallbackReason = "missing_key" | "invalid_key" | "unavailable";

async function fallbackChatResponse(message: string, reason: FallbackReason = "missing_key"): Promise<string> {
  const lower = message.toLowerCase();
  const insights = await getAdminInsights();
  const dashboard = await import("@/lib/admin-os-server").then((m) => m.getAdminDashboardOS());
  const setupHint =
    reason === "invalid_key"
      ? "_OPENROUTER_API_KEY is set but rejected by OpenRouter (401). Create a new key at openrouter.ai/keys and update Vercel + redeploy._"
      : reason === "unavailable"
        ? "_OpenRouter is configured but unavailable. Try again shortly._"
        : "_Set OPENROUTER_API_KEY for full AI intelligence._";

  if (lower.includes("today") || lower.includes("focus")) {
    const top = insights.insights[0];
    return top
      ? `**Today's priority:** ${top.title}\n\n${top.detail}\n\n→ ${top.action}: ${top.href.replace("/admin", "")}\n\n${setupHint}`
      : `You're caught up. ${dashboard.metrics.pendingTasks} tasks pending. Review your pipeline at /admin/pipeline.\n\n${setupHint}`;
  }

  if (lower.includes("revenue") || lower.includes("booking")) {
    return `**Bookings:** ${dashboard.metrics.bookings.value} total, ${dashboard.metrics.bookings.pending} pending.\n**Pipeline value:** ~$${dashboard.metrics.revenue.value.toLocaleString()} (estimated).\n**Growth:** ${dashboard.metrics.monthlyGrowth}% vs last month.\n\n${setupHint}`;
  }

  const snap = insights.insights.slice(0, 3).map((i) => `• **${i.title}** — ${i.detail}`).join("\n");
  return `**ÉLEVÉ AI** (rule-based mode)\n\n${snap || "No insights right now. Check /admin/insights."}\n\n${setupHint}`;
}
