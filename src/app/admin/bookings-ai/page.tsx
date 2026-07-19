import { AdminShell } from "@/components/admin/AdminShell";
import { BookingAssistantPanel } from "@/components/admin/ai/BookingAssistantPanel";

export default function AdminBookingsAIPage() {
  return (
    <AdminShell title="Booking Intelligence">
      <BookingAssistantPanel />
    </AdminShell>
  );
}
