import { AdminShell } from "@/components/admin/AdminShell";
import { AIAssistantChat } from "@/components/admin/ai/AIAssistantChat";
import { AIDailyBriefingPanel } from "@/components/admin/ai/AIDailyBriefingPanel";
import { AdminPageHeader } from "@/components/admin/os/AdminOSComponents";

export default function AdminAssistantPage() {
  return (
    <AdminShell title="ÉLEVÉ AI">
      <AdminPageHeader
        eyebrow="Intelligence Layer"
        title="ÉLEVÉ AI"
        description="Your executive brain — learns from every booking, campaign, and client interaction. Recommendations use structured memory, live data, and outcome learning."
      />

      <div className="mb-8">
        <AIDailyBriefingPanel />
      </div>

      <AIAssistantChat />
    </AdminShell>
  );
}
