import { AdminShell } from "@/components/admin/AdminShell";
import { AIAssistantChat } from "@/components/admin/ai/AIAssistantChat";
import { AIDailyBriefingPanel } from "@/components/admin/ai/AIDailyBriefingPanel";
import { AdminPageHeader } from "@/components/admin/os/AdminOSComponents";

export default function AdminAssistantPage() {
  return (
    <AdminShell title="AI Assistant">
      <AdminPageHeader
        eyebrow="Intelligence Layer"
        title="ÉLEVÉ AI"
        description="Your business partner — bookings, clients, sessions, marketing, and strategy. All answers use live studio data."
      />

      <div className="mb-8">
        <AIDailyBriefingPanel />
      </div>

      <AIAssistantChat />
    </AdminShell>
  );
}
