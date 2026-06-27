export function formatLocalWithUtc(iso: string): { local: string; utc: string; tz: string } {
  const d = new Date(iso);
  const local = d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const utc =
    d.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }) + " UTC";
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    tz = "";
  }
  return { local, utc, tz };
}
