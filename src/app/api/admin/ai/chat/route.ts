import { requireAdmin } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import { streamAIChat } from "@/lib/ai/service";
import type { AIMessage } from "@/lib/ai/types";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const blocked = await guardMutatingAdminAi(request, "admin-ai:chat");
  if (blocked) return blocked;

  const body = await request.json();
  const message = String(body.message || "").trim();
  const history = Array.isArray(body.history) ? (body.history as AIMessage[]) : [];
  const role = typeof body.role === "string" ? body.role : undefined;

  if (!message) {
    return Response.json({ error: "Message required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamAIChat(message, history, { role })) {
          if (chunk.type === "text" && chunk.text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.text })}\n\n`));
          }
          if (chunk.type === "error") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: chunk.error })}\n\n`));
          }
          if (chunk.type === "done") {
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
