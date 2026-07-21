import { AdminShell } from "@/components/admin/AdminShell";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import { AIContextProvider } from "@/components/admin/ai/AIContextProvider";
import { BriefingProvider } from "@/components/admin/ai/BriefingProvider";
import { AskAIPanel } from "@/components/admin/ai/AskAIPanel";

export default function AdminWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminToastProvider>
      <AIContextProvider>
        <BriefingProvider>
          <AdminShell>{children}</AdminShell>
          <AskAIPanel />
        </BriefingProvider>
      </AIContextProvider>
    </AdminToastProvider>
  );
}
