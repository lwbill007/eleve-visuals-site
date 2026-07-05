import { prisma } from "@/lib/db";

export async function getAIMemory(category: string, key: string): Promise<Record<string, unknown> | null> {
  const row = await prisma.aIMemory.findUnique({
    where: { category_key: { category, key } },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function setAIMemory(category: string, key: string, value: Record<string, unknown>): Promise<void> {
  await prisma.aIMemory.upsert({
    where: { category_key: { category, key } },
    create: { category, key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

export async function getAIMemoriesByCategory(category: string, limit = 50): Promise<{ key: string; value: Record<string, unknown> }[]> {
  const rows = await prisma.aIMemory.findMany({
    where: { category },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map((r) => {
    try {
      return { key: r.key, value: JSON.parse(r.value) as Record<string, unknown> };
    } catch {
      return { key: r.key, value: {} };
    }
  });
}

export async function appendConversationMessage(
  page: string,
  context: Record<string, unknown>,
  message: { role: string; content: string }
): Promise<void> {
  const existing = await prisma.aIConversation.findFirst({
    where: { page },
    orderBy: { updatedAt: "desc" },
  });

  const messages = existing
    ? (() => {
        try {
          return JSON.parse(existing.messages) as { role: string; content: string }[];
        } catch {
          return [];
        }
      })()
    : [];

  messages.push(message);
  const trimmed = messages.slice(-40);

  if (existing) {
    await prisma.aIConversation.update({
      where: { id: existing.id },
      data: {
        context: JSON.stringify(context),
        messages: JSON.stringify(trimmed),
      },
    });
  } else {
    await prisma.aIConversation.create({
      data: {
        page,
        context: JSON.stringify(context),
        messages: JSON.stringify(trimmed),
      },
    });
  }
}

export async function getConversationHistory(page: string): Promise<{ role: string; content: string }[]> {
  const row = await prisma.aIConversation.findFirst({
    where: { page },
    orderBy: { updatedAt: "desc" },
  });
  if (!row) return [];
  try {
    return JSON.parse(row.messages) as { role: string; content: string }[];
  } catch {
    return [];
  }
}

export async function buildMemoryContext(): Promise<string> {
  const [clients, pages, sessions] = await Promise.all([
    getAIMemoriesByCategory("client", 10),
    getAIMemoriesByCategory("page", 5),
    getAIMemoriesByCategory("session", 5),
  ]);
  return JSON.stringify({ recentClientContext: clients, pageContext: pages, sessionContext: sessions });
}
