import { AdminToastProvider } from "@/components/admin/AdminToast";
import { AIContextProvider } from "@/components/admin/ai/AIContextProvider";
import { AskAIPanel } from "@/components/admin/ai/AskAIPanel";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminToastProvider>
      <AIContextProvider>
        {children}
        <AskAIPanel />
      </AIContextProvider>
    </AdminToastProvider>
  );
}
