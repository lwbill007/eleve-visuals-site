import { adminFetch } from "@/lib/admin-fetch";

export async function loadAdminContentKey<T>(key: string, fallback: T): Promise<T> {
  const res = await adminFetch("/api/admin/content");
  if (!res.ok) return fallback;
  const all = (await res.json()) as { key: string; value: unknown }[];
  const item = all.find((c) => c.key === key);
  if (!item?.value) return fallback;
  return { ...fallback, ...(item.value as T) };
}
