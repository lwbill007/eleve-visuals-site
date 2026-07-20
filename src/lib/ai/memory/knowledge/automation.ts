import { getMemory, writeMemory } from "../store";
import { getWorkspaceId } from "../workspace";
import type { RefreshTrigger } from "./types";

export interface IntelligenceAutomationSettings {
  enabled: boolean;
  schedules: RefreshTrigger[];
  lastRunAt?: string;
  lastRunTrigger?: RefreshTrigger;
  updatedAt?: string;
}

const SETTINGS_KEY = "default";

const DEFAULT_SETTINGS: IntelligenceAutomationSettings = {
  enabled: true,
  schedules: ["manual"],
};

export async function getIntelligenceAutomationSettings(): Promise<IntelligenceAutomationSettings> {
  const mem = await getMemory("operational", "automation", SETTINGS_KEY, getWorkspaceId());
  if (!mem?.value) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...(mem.value as unknown as IntelligenceAutomationSettings) };
}

export async function setIntelligenceAutomationSettings(
  settings: Partial<IntelligenceAutomationSettings>
): Promise<IntelligenceAutomationSettings> {
  const current = await getIntelligenceAutomationSettings();
  const next: IntelligenceAutomationSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  await writeMemory({
    workspaceId: getWorkspaceId(),
    layer: "operational",
    category: "automation",
    key: SETTINGS_KEY,
    title: "Intelligence refresh automation",
    summary: `Schedules: ${next.schedules.join(", ")}`,
    value: next as unknown as Record<string, unknown>,
    confidence: 1,
    importance: 75,
    source: "sync",
    sourceRef: "automation:settings",
    tags: ["automation", "intelligence-os"],
    actor: "admin",
    reason: "Automation settings updated",
    verified: true,
  });

  return next;
}

export async function recordAutomationRun(trigger: RefreshTrigger): Promise<void> {
  const current = await getIntelligenceAutomationSettings();
  await setIntelligenceAutomationSettings({
    ...current,
    lastRunAt: new Date().toISOString(),
    lastRunTrigger: trigger,
  });
}

export function isScheduleEnabled(
  settings: IntelligenceAutomationSettings,
  trigger: RefreshTrigger
): boolean {
  if (!settings.enabled) return trigger === "manual";
  return settings.schedules.includes(trigger);
}

export async function shouldRunScheduledRefresh(
  schedule: "daily" | "weekly"
): Promise<boolean> {
  const settings = await getIntelligenceAutomationSettings();
  return isScheduleEnabled(settings, schedule);
}

export function getAutomationOptions(settings: IntelligenceAutomationSettings) {
  return [
    { id: "manual" as RefreshTrigger, label: "Manual only", available: true, enabled: true },
    {
      id: "deployment" as RefreshTrigger,
      label: "After each deployment",
      available: true,
      enabled: settings.schedules.includes("deployment"),
    },
    {
      id: "daily" as RefreshTrigger,
      label: "Every night",
      available: true,
      enabled: settings.schedules.includes("daily"),
    },
    {
      id: "weekly" as RefreshTrigger,
      label: "Every week",
      available: true,
      enabled: settings.schedules.includes("weekly"),
    },
    {
      id: "portfolio_upload" as RefreshTrigger,
      label: "After portfolio uploads",
      available: true,
      enabled: settings.schedules.includes("portfolio_upload"),
    },
    {
      id: "session_publish" as RefreshTrigger,
      label: "After publishing content",
      available: true,
      enabled: settings.schedules.includes("session_publish"),
    },
    {
      id: "booking_received" as RefreshTrigger,
      label: "After new bookings",
      available: true,
      enabled: settings.schedules.includes("booking_received"),
    },
    {
      id: "marketing_campaign" as RefreshTrigger,
      label: "After marketing campaigns",
      available: true,
      enabled: settings.schedules.includes("marketing_campaign"),
    },
    {
      id: "crm_update" as RefreshTrigger,
      label: "After CRM updates",
      available: true,
      enabled: settings.schedules.includes("crm_update"),
    },
  ];
}
