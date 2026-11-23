/**
 * Application cycles: every session application belongs to one volume.
 * The admin list opens on the current cycle instead of mixing every volume.
 * Pure helpers, shared by the admin client, the admin APIs and tests.
 */

/** Admin filter value: applications with no volume (need manual review). */
export const UNASSIGNED_VOLUME = "unassigned";
/** Admin filter value: every cycle at once (explicit opt-in). */
export const ALL_VOLUMES = "all";

type VolumeLike = {
  id: string;
  volumeNumber: number;
  status: string;
  published?: boolean;
  archived?: boolean;
};

/**
 * The cycle the admin list should open on:
 *   1. the volume currently taking applications;
 *   2. otherwise the newest volume that isn't archived or completed
 *      (e.g. VOL. 3 in draft while it's being prepared);
 *   3. otherwise the newest volume of all;
 *   4. otherwise every cycle.
 */
export function pickDefaultVolumeId(volumes: readonly VolumeLike[]): string {
  const newestFirst = [...volumes].sort((a, b) => b.volumeNumber - a.volumeNumber);
  const open = newestFirst.find((v) => v.status === "applications_open" && v.published !== false);
  if (open) return open.id;
  const current = newestFirst.find(
    (v) => !v.archived && v.status !== "archived" && v.status !== "completed"
  );
  if (current) return current.id;
  return newestFirst[0]?.id ?? ALL_VOLUMES;
}

/** Prisma `where` fragment for a volume filter value from the admin UI. */
export function volumeFilterWhere(
  value: string | null | undefined
): { sessionVolumeId?: string | null } {
  if (!value || value === ALL_VOLUMES) return {};
  if (value === UNASSIGNED_VOLUME) return { sessionVolumeId: null };
  return { sessionVolumeId: value };
}

/** A real volume id (for ranking and volume stats), or undefined. */
export function concreteVolumeId(value: string | null | undefined): string | undefined {
  if (!value || value === ALL_VOLUMES || value === UNASSIGNED_VOLUME) return undefined;
  return value;
}

export type VolumeRef = { id: string; slug: string; title: string; volumeNumber: number };

export type AssignmentFinding =
  | { kind: "confident"; volumeId: string; evidence: string }
  | { kind: "probable"; volumeId: string; evidence: string }
  | { kind: "conflict"; evidence: string }
  | { kind: "no_evidence"; evidence: string };

/**
 * Decide which volume an unassigned application belongs to, using only what
 * the applicant's own submission recorded. Never guesses from dates:
 *   confident = the stored volume id or slug matches exactly one volume;
 *   probable  = only the stored title matches (reported, never auto-applied);
 *   conflict  = stored id/slug/number point at different volumes;
 *   no_evidence = nothing in the payload identifies a volume.
 */
export function classifyUnassignedApplication(
  data: Record<string, unknown>,
  volumes: readonly VolumeRef[]
): AssignmentFinding {
  const str = (key: string) => (typeof data[key] === "string" ? (data[key] as string).trim() : "");
  const byId = volumes.find((v) => v.id === str("sessionVolumeId"));
  const slug = str("sessionVolumeSlug").toLowerCase();
  const bySlug = slug ? volumes.find((v) => v.slug.toLowerCase() === slug) : undefined;
  const number = typeof data.sessionVolumeNumber === "number" ? data.sessionVolumeNumber : null;
  const byNumber = number != null ? volumes.filter((v) => v.volumeNumber === number) : [];

  const hits = new Set([byId?.id, bySlug?.id, byNumber.length === 1 ? byNumber[0].id : undefined].filter(Boolean));
  if (hits.size > 1) {
    return { kind: "conflict", evidence: "Stored volume id, slug or number disagree" };
  }
  if (byId) return { kind: "confident", volumeId: byId.id, evidence: "Stored volume id" };
  if (bySlug) return { kind: "confident", volumeId: bySlug.id, evidence: `Stored volume slug "${slug}"` };

  const title = str("sessionVolumeTitle").toLowerCase();
  const byTitle = title ? volumes.filter((v) => v.title.trim().toLowerCase() === title) : [];
  if (byTitle.length === 1) {
    return { kind: "probable", volumeId: byTitle[0].id, evidence: `Stored title "${title}" only` };
  }
  if (byNumber.length === 1) {
    return { kind: "probable", volumeId: byNumber[0].id, evidence: `Stored volume number ${number} only` };
  }
  return { kind: "no_evidence", evidence: "No volume recorded in the application" };
}
