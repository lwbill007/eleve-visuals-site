import { discoverPlatformRoutes } from "./route-discovery";
import { analyzePlatformRoutes, understandingToFinding } from "./semantic-analyzer";
import type { KnowledgeFinding } from "./types";
import type { DiscoveredRoute } from "./route-discovery";

export async function scanEntirePlatform(): Promise<{
  findings: KnowledgeFinding[];
  pagesScanned: string[];
  routes: DiscoveredRoute[];
}> {
  const routes = await discoverPlatformRoutes();
  const understandings = await analyzePlatformRoutes(routes);
  const findings = understandings.map(understandingToFinding);
  const pagesScanned = routes.map((r) => r.path);

  return { findings, pagesScanned, routes };
}
