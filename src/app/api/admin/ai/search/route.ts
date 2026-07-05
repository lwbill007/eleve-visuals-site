import { requireAdmin } from "@/lib/auth";
import { aiNaturalLanguageSearch } from "@/lib/ai/service";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await request.json();
  const query = String(body.query || "").trim();
  if (!query) {
    return Response.json({ error: "Query required" }, { status: 400 });
  }

  const result = await aiNaturalLanguageSearch(query);
  return Response.json(result);
}
