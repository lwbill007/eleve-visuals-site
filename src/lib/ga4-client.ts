import "server-only";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

export interface GA4DailyMetrics {
  date: Date;
  sessions: number;
  activeUsers: number;
  conversions: number;
}

export function isGA4Configured(): boolean {
  return Boolean(
    process.env.GA4_PROPERTY_ID?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()
  );
}

function getClient(): BetaAnalyticsDataClient {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  // Vercel env vars can't hold literal newlines — the key is stored with escaped \n.
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");
  return new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
}

/** Pull yesterday's sessions/activeUsers/conversions from the GA4 Data API. Throws on failure — callers must catch. */
export async function fetchGA4DailyMetrics(daysAgo = 1): Promise<GA4DailyMetrics> {
  if (!isGA4Configured()) {
    throw new Error("GA4 not configured — missing GA4_PROPERTY_ID or service account credentials.");
  }

  const propertyId = process.env.GA4_PROPERTY_ID!.trim();
  const client = getClient();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${daysAgo}daysAgo`, endDate: `${daysAgo}daysAgo` }],
    metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "conversions" }],
  });

  const row = response.rows?.[0];
  const values = row?.metricValues ?? [];

  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(0, 0, 0, 0);

  return {
    date,
    sessions: Number(values[0]?.value ?? 0),
    activeUsers: Number(values[1]?.value ?? 0),
    conversions: Number(values[2]?.value ?? 0),
  };
}
