import { requireMinimumRole } from "@/lib/auth";
import { aiNaturalLanguageSearch } from "@/lib/ai/service";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";

export async function POST(request: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(request, "admin-ai:search");
  if (blocked) return blocked;

  const body = await request.json();
  const query = String(body.query || "").trim();
  if (!query) {
    return Response.json({ error: "Query required" }, { status: 400 });
  }

  const result = await aiNaturalLanguageSearch(query);
  return Response.json(result);
}
