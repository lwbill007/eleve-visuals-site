import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runDatabaseHealthCheck } from "@/lib/db-health";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await runDatabaseHealthCheck();
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database health check failed";
    const isInitError = message.includes("PrismaClientInitializationError") || message.includes("DATABASE_URL");
    return NextResponse.json(
      {
        overall: "error",
        error: message,
        hint: isInitError
          ? "Set DATABASE_URL to your Neon PostgreSQL URL. Remove empty DATABASE_URL from .env.local if present."
          : undefined,
      },
      { status: 500 }
    );
  }
}
