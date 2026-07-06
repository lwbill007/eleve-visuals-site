import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";

export type RouteKind = "public" | "admin" | "dynamic";

export interface DiscoveredRoute {
  path: string;
  template: string;
  kind: RouteKind;
  segment: string;
  filePath: string;
  discoveredAt: string;
}

const SKIP_SEGMENTS = new Set(["api", "login", "_not-found"]);
const SKIP_ADMIN = new Set(["login"]);

function templateToRegex(template: string): RegExp | null {
  if (!template.includes("[")) return null;
  const pattern = template.replace(/\[[^\]]+\]/g, "[^/]+");
  return new RegExp(`^${pattern}$`);
}

function filePathToRouteTemplate(relativeDir: string): string {
  const segments = relativeDir
    .split(path.sep)
    .filter(Boolean)
    .filter((s) => !(s.startsWith("(") && s.endsWith(")")));

  if (segments.length === 0) return "/";
  return `/${segments.join("/")}`;
}

async function walkForPages(dir: string, base = "src/app"): Promise<{ relativeDir: string; filePath: string }[]> {
  const results: { relativeDir: string; filePath: string }[] = [];
  let entries: { name: string; isDirectory: () => boolean }[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(path.join(process.cwd(), base), full);

    if (entry.isDirectory()) {
      if (SKIP_SEGMENTS.has(entry.name)) continue;
      results.push(...(await walkForPages(full, base)));
    } else if (entry.name === "page.tsx") {
      results.push({ relativeDir: path.dirname(rel), filePath: full });
    }
  }
  return results;
}

export async function discoverRoutesFromFilesystem(): Promise<DiscoveredRoute[]> {
  const appDir = path.join(process.cwd(), "src/app");
  const pages = await walkForPages(appDir);
  const now = new Date().toISOString();
  const routes: DiscoveredRoute[] = [];

  for (const { relativeDir, filePath } of pages) {
    const template = filePathToRouteTemplate(relativeDir);
    const isAdmin = relativeDir.startsWith("admin") || relativeDir.includes(`${path.sep}admin`);
    const segment = relativeDir.split(path.sep).pop() ?? "root";

    if (isAdmin && SKIP_ADMIN.has(segment)) continue;

    routes.push({
      path: template,
      template,
      kind: isAdmin ? "admin" : template.includes("[") ? "dynamic" : "public",
      segment,
      filePath,
      discoveredAt: now,
    });
  }

  return routes;
}

export async function expandDynamicRoutes(templates: DiscoveredRoute[]): Promise<DiscoveredRoute[]> {
  const expanded: DiscoveredRoute[] = [];
  const now = new Date().toISOString();

  const [portfolio, volumes, cast] = await Promise.all([
    prisma.portfolioItem.findMany({ where: { published: true, archived: false }, select: { slug: true, title: true } }),
    prisma.sessionVolume.findMany({ where: { archived: false }, select: { slug: true, title: true, volumeNumber: true } }),
    prisma.castMember.findMany({ where: { slug: { not: "" }, enableProfile: true }, select: { slug: true } }),
  ]);

  for (const route of templates) {
    if (route.template === "/portfolio/[slug]") {
      for (const p of portfolio) {
        expanded.push({
          ...route,
          path: `/portfolio/${p.slug}`,
          kind: "dynamic",
          discoveredAt: now,
        });
      }
      continue;
    }
    if (route.template === "/sessions/[slug]") {
      for (const v of volumes) {
        expanded.push({ ...route, path: `/sessions/${v.slug}`, kind: "dynamic", discoveredAt: now });
      }
      continue;
    }
    if (route.template === "/sessions/[slug]/apply") {
      for (const v of volumes.filter((v) => v.slug)) {
        expanded.push({ ...route, path: `/sessions/${v.slug}/apply`, kind: "dynamic", discoveredAt: now });
      }
      continue;
    }
    if (route.template === "/sessions/cast/[slug]") {
      for (const c of cast) {
        expanded.push({ ...route, path: `/sessions/cast/${c.slug}`, kind: "dynamic", discoveredAt: now });
      }
      continue;
    }
    if (route.template === "/admin/crm/[email]") {
      continue;
    }
    if (!route.template.includes("[")) {
      expanded.push(route);
    }
  }

  const seen = new Set<string>();
  return expanded.filter((r) => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });
}

export function discoverInfrastructureRoutes(): DiscoveredRoute[] {
  const now = new Date().toISOString();
  return [
    { path: "/robots.txt", template: "/robots.txt", kind: "public", segment: "robots", filePath: "public/robots.txt", discoveredAt: now },
    { path: "/sitemap.xml", template: "/sitemap.xml", kind: "public", segment: "sitemap", filePath: "src/app/sitemap.ts", discoveredAt: now },
    { path: "/404", template: "/404", kind: "public", segment: "not-found", filePath: "src/app/not-found.tsx", discoveredAt: now },
  ];
}

export async function discoverPlatformRoutes(): Promise<DiscoveredRoute[]> {
  const templates = await discoverRoutesFromFilesystem();
  const expanded = await expandDynamicRoutes(templates);

  for (const infra of discoverInfrastructureRoutes()) {
    if (!expanded.some((r) => r.path === infra.path)) {
      expanded.push(infra);
    }
  }

  return expanded.sort((a, b) => a.path.localeCompare(b.path));
}

export function matchRoute(path: string, routes: DiscoveredRoute[]): DiscoveredRoute | undefined {
  const exact = routes.find((r) => r.path === path);
  if (exact) return exact;
  for (const r of routes) {
    const re = templateToRegex(r.template);
    if (re?.test(path)) return { ...r, path };
  }
  return undefined;
}
