import { requireAdmin } from "@/lib/auth";
import { appendConversationMessage, buildMemoryContext, getConversationHistory } from "@/lib/ai/memory";
import { streamAIChat } from "@/lib/ai/service";
import { PAGE_AI_PROMPTS, type AIContextPayload } from "@/lib/ai/types";
import { systemPromptForAssistant } from "@/lib/ai/prompts/system";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { message, context } = (await req.json()) as {
    message?: string;
    context?: AIContextPayload;
  };

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "Message required" }), { status: 400 });
  }

  const page = context?.page || "general";
  const pageConfig = PAGE_AI_PROMPTS[page];
  const history = await getConversationHistory(page);
  const memory = await buildMemoryContext();

  const systemContext = `${systemPromptForAssistant()}

Current page: ${pageConfig.label}
Page context: ${JSON.stringify(context?.data ?? {})}
Memory: ${memory}

Respond with awareness of where the user is in the admin. Be actionable.`;

  const enrichedMessage = context?.data
    ? `${message}\n\n[Page data]\n${JSON.stringify(context.data).slice(0, 4000)}`
    : message;

  await appendConversationMessage(page, context?.data ?? {}, { role: "user", content: message });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let accumulated = "";
        for await (const chunk of streamAIChat(enrichedMessage, [
          { role: "system", content: systemContext },
          ...history.slice(-6).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ])) {
          if (chunk.type === "text" && chunk.text) {
            accumulated += chunk.text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.text })}\n\n`));
          }
          if (chunk.type === "error") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: chunk.error })}\n\n`));
          }
          if (chunk.type === "done") {
            await appendConversationMessage(page, context?.data ?? {}, {
              role: "assistant",
              content: accumulated,
            });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : "Stream failed" })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
