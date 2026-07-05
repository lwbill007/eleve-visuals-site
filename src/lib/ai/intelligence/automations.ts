import { prisma } from "@/lib/db";
import { generateAIContent } from "../service";

export interface AutomationDTO {
  id: string;
  name: string;
  description: string;
  trigger: Record<string, unknown>;
  steps: { order: number; action: string; delay?: string; template?: string }[];
  enabled: boolean;
  createdAt: string;
}

export async function listAutomations(): Promise<AutomationDTO[]> {
  const rows = await prisma.aIAutomation.findMany({ orderBy: { updatedAt: "desc" } });
  return rows.map(parseAutomation);
}

function parseAutomation(row: {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: string;
  enabled: boolean;
  createdAt: Date;
}): AutomationDTO {
  let trigger: Record<string, unknown> = {};
  let steps: AutomationDTO["steps"] = [];
  try {
    trigger = JSON.parse(row.trigger) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  try {
    steps = JSON.parse(row.steps) as AutomationDTO["steps"];
  } catch {
    /* ignore */
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    trigger,
    steps,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createAutomationFromPrompt(prompt: string): Promise<{ automation: AutomationDTO; draft: string }> {
  const result = await generateAIContent({
    task: "automation_workflow",
    prompt,
  });

  const nameMatch = prompt.match(/(?:for|workflow for)\s+(.+)/i);
  const name = nameMatch?.[1]?.slice(0, 60) || "Custom Workflow";

  const steps = parseStepsFromDraft(result.content);

  const row = await prisma.aIAutomation.create({
    data: {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: prompt.slice(0, 200),
      trigger: JSON.stringify({ type: "manual", event: inferTrigger(prompt) }),
      steps: JSON.stringify(steps),
      enabled: false,
    },
  });

  return { automation: parseAutomation(row), draft: result.content };
}

function inferTrigger(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("booking")) return "booking_created";
  if (lower.includes("application")) return "application_received";
  if (lower.includes("session")) return "session_scheduled";
  if (lower.includes("portrait")) return "booking_completed";
  return "manual";
}

function parseStepsFromDraft(content: string): AutomationDTO["steps"] {
  const lines = content.split("\n").filter((l) => /^\d+\./.test(l.trim()) || l.trim().startsWith("-"));
  if (lines.length === 0) {
    return [
      { order: 1, action: "Review workflow draft", delay: "0", template: content.slice(0, 500) },
      { order: 2, action: "Enable when ready", delay: "manual" },
    ];
  }
  return lines.slice(0, 8).map((line, i) => ({
    order: i + 1,
    action: line.replace(/^[\d\-.\s]+/, "").trim(),
    delay: line.toLowerCase().includes("day") ? line.match(/(\d+)\s*day/)?.[0] : undefined,
  }));
}

export async function toggleAutomation(id: string, enabled: boolean) {
  await prisma.aIAutomation.update({ where: { id }, data: { enabled } });
}

export async function deleteAutomation(id: string) {
  await prisma.aIAutomation.delete({ where: { id } });
}
