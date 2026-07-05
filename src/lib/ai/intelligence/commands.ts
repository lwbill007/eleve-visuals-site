import { adminGlobalSearch, getAdminCRMContacts, getAdminDashboardOS } from "@/lib/admin-os-server";
import { getCommandCenterHub } from "./business-operator";
import { prisma } from "@/lib/db";
import { generateAIContent } from "../service";
import type { AICommandResult } from "../types";

function extractName(query: string): string | null {
  const patterns = [
    /(?:for|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /(?:client|contact)\s+([A-Z][a-z]+)/i,
  ];
  for (const p of patterns) {
    const m = query.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function extractVolume(query: string): number | null {
  const m = query.match(/vol\.?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

export async function executeAICommand(raw: string): Promise<AICommandResult> {
  const query = raw.trim();
  const lower = query.toLowerCase();

  if (!query) {
    return { type: "message", message: "Enter a command or question.", provider: "rules" };
  }

  const hubKeywords = ["revenue", "marketing", "sponsors", "clients", "bookings", "portfolio", "sessions"];
  if (hubKeywords.includes(lower) || hubKeywords.some((k) => lower === k)) {
    const hub = await getCommandCenterHub(lower);
    if (hub) {
      return {
        type: hub.actions.length > 0 ? "search" : "navigate",
        href: hub.href,
        message: hub.summary,
        label: hub.title,
        results: hub.actions.map((a) => ({
          label: a.label,
          href: a.href + (a.task ? `?task=${a.task}` : "") + (a.prompt ? `${a.task ? "&" : "?"}prompt=${encodeURIComponent(a.prompt)}` : ""),
          category: hub.title,
        })),
        provider: "rules",
      };
    }
  }

  if (lower.includes("show revenue") || (lower === "revenue" || lower.startsWith("revenue "))) {
    const dash = await getAdminDashboardOS();
    return {
      type: "navigate",
      href: "/admin/analytics",
      message: `Pipeline value: ~$${dash.metrics.revenue.value.toLocaleString()}. Bookings growth: ${dash.metrics.monthlyGrowth}%.`,
      label: "View Analytics",
      provider: "rules",
    };
  }

  if (lower.includes("open application") || lower.includes("applications")) {
    const vol = extractVolume(query);
    if (vol) {
      const volume = await prisma.sessionVolume.findFirst({ where: { volumeNumber: vol } });
      return {
        type: "navigate",
        href: volume ? `/admin/applications?volumeId=${volume.id}` : "/admin/applications",
        message: volume ? `Opening Vol. ${vol} applications.` : `Opening applications.`,
        label: "Applications",
        provider: "rules",
      };
    }
    return {
      type: "navigate",
      href: "/admin/applications",
      message: "Opening session applications.",
      label: "Applications",
      provider: "rules",
    };
  }

  if (lower.includes("inactive") || lower.includes("hasn't booked")) {
    const contacts = await getAdminCRMContacts();
    const inactive = contacts.filter((c) => {
      const days = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;
      return days > 90;
    });
    return {
      type: "navigate",
      href: "/admin/crm",
      message: `Found ${inactive.length} inactive client${inactive.length === 1 ? "" : "s"}.`,
      label: "Open CRM",
      results: inactive.slice(0, 8).map((c) => ({
        label: c.name || c.email,
        href: `/admin/crm/${encodeURIComponent(c.email)}`,
        category: "CRM",
      })),
      provider: "rules",
    };
  }

  if (lower.includes("create invoice") || lower.includes("invoice")) {
    const name = extractName(query);
    if (name) {
      const contacts = await getAdminCRMContacts();
      const match = contacts.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));
      if (match) {
        return {
          type: "navigate",
          href: `/admin/crm/${encodeURIComponent(match.email)}`,
          message: `No invoicing module yet — opening ${match.name}'s CRM profile. Pipeline LTV: ~$${match.revenue.toLocaleString()}.`,
          label: match.name,
          provider: "rules",
        };
      }
    }
    return {
      type: "navigate",
      href: "/admin/pipeline",
      message: "Invoicing is estimated from pipeline. Open pipeline to review open deals.",
      label: "Pipeline",
      provider: "rules",
    };
  }

  if (lower.includes("email") && (lower.includes("applicant") || lower.includes("vol"))) {
    const vol = extractVolume(query) ?? 2;
    const volume = await prisma.sessionVolume.findFirst({ where: { volumeNumber: vol } });
    const draft = await generateAIContent({
      task: "session_email",
      prompt: `Write a group email to all Vol. ${vol} ÉLEVÉ Sessions applicants. Professional, cinematic tone. DRAFT.`,
    });
    return {
      type: "draft",
      href: volume ? `/admin/applications?volumeId=${volume.id}` : "/admin/applications",
      message: `Draft ready for Vol. ${vol} applicants. Review before sending.`,
      draft: draft.content,
      label: "Review Applications",
      provider: draft.provider,
    };
  }

  if (lower.includes("marketing campaign") || lower.includes("create campaign")) {
    const draft = await generateAIContent({
      task: "campaign",
      prompt: query.replace(/create\s+/i, ""),
    });
    return {
      type: "draft",
      href: "/admin/marketing",
      message: "Campaign draft generated.",
      draft: draft.content,
      label: "Marketing Studio",
      provider: draft.provider,
    };
  }

  if (lower.includes("generate report") || lower.includes("report")) {
    return {
      type: "navigate",
      href: "/admin/reports",
      message: "Opening Business Intelligence reports.",
      label: "Reports",
      provider: "rules",
    };
  }

  if (lower.includes("book client") || lower.includes("create booking")) {
    return {
      type: "navigate",
      href: "/admin/submissions?type=booking",
      message: "Opening booking inquiries.",
      label: "Bookings",
      provider: "rules",
    };
  }

  if (lower.includes("workflow") || lower.includes("automation")) {
    const draft = await generateAIContent({
      task: "automation_workflow",
      prompt: query,
    });
    return {
      type: "draft",
      href: "/admin/automations",
      message: "Workflow draft generated. Save as automation when ready.",
      draft: draft.content,
      label: "Automations",
      provider: draft.provider,
    };
  }

  const search = await adminGlobalSearch(query);
  if (search.results.length > 0) {
    return {
      type: "search",
      message: `Found ${search.results.length} result${search.results.length === 1 ? "" : "s"}.`,
      results: search.results,
      provider: "rules",
    };
  }

  return {
    type: "navigate",
    href: "/admin/intelligence",
    message: `Opening AI assistant for: "${query}"`,
    label: "Ask ÉLEVÉ AI",
    provider: "rules",
  };
}
