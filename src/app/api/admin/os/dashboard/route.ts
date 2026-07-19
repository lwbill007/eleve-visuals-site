import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildCommandHome } from "@/lib/ai/platform/command-home";
import { getCached, setCache } from "@/lib/ai/cache";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get("refresh") === "1";
  const cacheKey = "command-home-v1";
  try {
    if (!force) {
      const cached = await getCached<Awaited<ReturnType<typeof buildCommandHome>>>(cacheKey);
      if (cached) return NextResponse.json(cached);
    }
    const data = await buildCommandHome();
    await setCache(cacheKey, data, 60_000).catch(() => {});
    return NextResponse.json(data);
  } catch (error) {
    console.error("Command home failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Command home could not be loaded.",
      },
      { status: 503 }
    );
  }
}
