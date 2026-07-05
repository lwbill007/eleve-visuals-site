import { getAIConfig, isAIConfigured } from "./config";
import { aiComplete, aiStream, getActiveProviderLabel } from "./adapter";
import { logAIAction } from "./log";
import { systemPromptForAssistant, systemPromptForTask, TASK_PROMPTS } from "./prompts/system";
import { BUSINESS_TOOLS, buildBusinessContextSnapshot, executeBusinessTool } from "./tools/business-data";
import { getAdminInsights } from "@/lib/admin-os-server";
import type { AIBriefing, AIGenerateRequest, AIMessage, AIStreamChunk } from "./types";

const briefingCache: { at: number; data: AIBriefing | null } = { at: 0, data: null };

export async function runAIChat(
  userMessage: string,
  history: AIMessage[] = []
): Promise<{ content: string; provider: string }> {
  if (!isAIConfigured()) {
    return { content: await fallbackChatResponse(userMessage), provider: "rules" };
  }

  const messages: AIMessage[] = [
    { role: "system", content: systemPromptForAssistant() },
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
  history: AIMessage[] = []
): AsyncGenerator<AIStreamChunk> {
  if (!isAIConfigured()) {
    const fallback = await fallbackChatResponse(userMessage);
    yield { type: "text", text: fallback };
    yield { type: "done" };
    return;
  }

  const snapshot = await buildBusinessContextSnapshot();
  const messages: AIMessage[] = [
    { role: "system", content: `${systemPromptForAssistant()}\n\nBusiness snapshot:\n${snapshot}` },
    ...history.slice(-8),
    { role: "user", content: userMessage },
  ];

  for await (const chunk of aiStream({ messages })) {
    yield chunk;
  }

  await logAIAction("ai_chat_stream", "assistant", userMessage.slice(0, 200));
}

export async function generateAIContent(request: AIGenerateRequest): Promise<{ content: string; provider: string }> {
  const taskPrompt = TASK_PROMPTS[request.task] || TASK_PROMPTS.general;
  const contextStr = request.context ? `\nContext:\n${JSON.stringify(request.context, null, 2)}` : "";

  if (!isAIConfigured()) {
    return {
      content: `[AI not configured — set OPENROUTER_API_KEY to enable generation]\n\nTask: ${request.task}\nPrompt: ${request.prompt}`,
      provider: "rules",
    };
  }

  const result = await aiComplete({
    messages: [
      { role: "system", content: systemPromptForTask(taskPrompt) },
      { role: "user", content: `${request.prompt}${contextStr}` },
    ],
    temperature: 0.8,
  });

  await logAIAction("ai_generate", request.task, request.prompt.slice(0, 200));

  if (!result?.content) {
    return {
      content: `[Generation failed — all models unavailable. Using rule-based mode.]\n\nTask: ${request.task}`,
      provider: "rules",
    };
  }

  return { content: result.content, provider: result.provider };
}

export async function getAIBriefing(force = false): Promise<AIBriefing> {
  const config = getAIConfig();
  if (!force && briefingCache.data && Date.now() - briefingCache.at < config.cacheTtlMs) {
    return briefingCache.data;
  }

  const [ruleInsights, dashboard] = await Promise.all([
    getAdminInsights(),
    import("@/lib/admin-os-server").then((m) => m.getAdminDashboardOS()),
  ]);

  const opportunities = ruleInsights.insights.map((i) => ({
    title: i.title,
    detail: i.detail,
    action: i.action,
    href: i.href,
  }));

  const scores = {
    businessHealth: Math.min(100, Math.max(20, 70 + dashboard.metrics.monthlyGrowth)),
    marketing: Math.min(100, Math.max(15, dashboard.metrics.conversionRate * 8)),
    sales: Math.min(100, Math.max(10, 100 - dashboard.metrics.bookings.pending * 5)),
    productivity: Math.min(100, Math.max(10, 100 - dashboard.metrics.pendingTasks * 8)),
  };

  let summary = `You have ${dashboard.metrics.pendingTasks} pending tasks. ${dashboard.metrics.bookings.pending} booking inquiries need follow-up. ${dashboard.metrics.applications.pending} applications await review.`;
  let provider: AIBriefing["provider"] = "rules";

  if (isAIConfigured()) {
    const result = await aiComplete({
      messages: [
        {
          role: "system",
          content: systemPromptForTask("Write a 2-sentence executive morning briefing for the studio owner."),
        },
        {
          role: "user",
          content: JSON.stringify({ metrics: dashboard.metrics, insights: ruleInsights.insights.slice(0, 4) }),
        },
      ],
      maxTokens: 300,
    });
    if (result?.content) {
      summary = result.content;
      provider = result.provider;
    }
  }

  const priorities = [
    dashboard.metrics.pendingTasks > 0 ? `Clear ${dashboard.metrics.pendingTasks} pending tasks` : null,
    dashboard.metrics.bookings.pending > 0 ? `Follow up on ${dashboard.metrics.bookings.pending} booking inquiries` : null,
    dashboard.metrics.applications.pending > 0 ? `Review ${dashboard.metrics.applications.pending} session applications` : null,
    opportunities[0]?.title ?? null,
  ].filter(Boolean) as string[];

  const briefing: AIBriefing = {
    generatedAt: new Date().toISOString(),
    provider,
    priorities: priorities.slice(0, 5),
    opportunities,
    scores,
    summary,
    forecast:
      dashboard.metrics.monthlyGrowth >= 0
        ? `Bookings trending up ${dashboard.metrics.monthlyGrowth}% vs last month.`
        : `Bookings down ${Math.abs(dashboard.metrics.monthlyGrowth)}% — prioritize outreach.`,
  };

  briefingCache.at = Date.now();
  briefingCache.data = briefing;
  return briefing;
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

async function fallbackChatResponse(message: string): Promise<string> {
  const lower = message.toLowerCase();
  const insights = await getAdminInsights();
  const dashboard = await import("@/lib/admin-os-server").then((m) => m.getAdminDashboardOS());
  const setupHint = "_Set OPENROUTER_API_KEY for full AI intelligence._";

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

export async function explainAnalytics(data: Record<string, unknown>): Promise<string> {
  const result = await generateAIContent({
    task: "analytics_explain",
    prompt: "Explain this analytics data for the studio owner.",
    context: data,
  });
  return result.content;
}
