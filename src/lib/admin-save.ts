import { adminFetch } from "@/lib/admin-fetch";

export async function saveAdminContent(key: string, value: unknown): Promise<boolean> {
  const res = await adminFetch("/api/admin/content", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  return res.ok;
}
