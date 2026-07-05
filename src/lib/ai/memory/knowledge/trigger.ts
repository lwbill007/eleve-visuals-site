import type { RefreshTrigger } from "./types";
import { getIntelligenceAutomationSettings, isScheduleEnabled } from "./automation";
import { refreshIntelligence } from "./refresh-and-learn";
import type { RefreshLearnReport } from "./types";

/** Fire-and-forget intelligence refresh when an event trigger is enabled. */
export async function triggerIntelligenceRefreshIfEnabled(
  trigger: RefreshTrigger
): Promise<RefreshLearnReport | null> {
  const settings = await getIntelligenceAutomationSettings();
  if (!isScheduleEnabled(settings, trigger)) return null;
  try {
    return await refreshIntelligence(trigger);
  } catch {
    return null;
  }
}

export async function triggerIntelligenceRefreshBackground(trigger: RefreshTrigger): Promise<void> {
  void triggerIntelligenceRefreshIfEnabled(trigger);
}
