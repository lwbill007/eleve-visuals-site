import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface ExternalApplicantEvidence {
  portfolio: {
    source: string;
    fetched: boolean;
    pageText: string;
    imageUrls: string[];
    error?: string;
  };
  social: {
    source: string;
    fetched: boolean;
    pageText: string;
    error?: string;
  };
}

const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;

function normalizeUrl(raw: string, social = false): string {
  const value = raw.trim();
  if (!value) return "";
  if (social && /^@?[a-z0-9._]+$/i.test(value)) {
    return `https://www.instagram.com/${value.replace(/^@/, "")}/`;
  }
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function isPrivateIp(address: string): boolean {
  if (address === "::1" || address === "0:0:0:0:0:0:0:1") return true;
  if (/^(fc|fd|fe8|fe9|fea|feb)/i.test(address)) return true;
  if (!address.includes(".")) return false;
  const parts = address.split(".").map(Number);
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

async function assertPublicUrl(value: string): Promise<URL> {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported URL protocol");
  if (
    url.username ||
    url.password ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local")
  ) {
    throw new Error("Private URL is not allowed");
  }
  if (isIP(url.hostname) && isPrivateIp(url.hostname)) throw new Error("Private IP is not allowed");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((item) => isPrivateIp(item.address))) {
    throw new Error("URL resolves to a private network");
  }
  return url;
}

async function readLimitedText(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Response exceeds evidence size limit");
    }
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}

async function fetchPublicHtml(raw: string): Promise<{ url: URL; html: string }> {
  let url = await assertPublicUrl(raw);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "EleveApplicantEvaluator/1.0",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect has no destination");
      url = await assertPublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("URL did not return an HTML page");
    }
    return { url, html: await readLimitedText(response) };
  }
  throw new Error("Too many redirects");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function pageText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  ).slice(0, 6_000);
}

function portfolioImages(html: string, pageUrl: URL): string[] {
  const candidates: string[] = [];
  const metaPattern =
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  const reversedMetaPattern =
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi;
  const imagePattern = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  for (const pattern of [metaPattern, reversedMetaPattern, imagePattern]) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) && candidates.length < 20) candidates.push(match[1]);
  }
  return [
    ...new Set(
      candidates.flatMap((candidate) => {
        try {
          const url = new URL(decodeEntities(candidate), pageUrl);
          if (!["http:", "https:"].includes(url.protocol)) return [];
          if (url.hostname === "localhost" || url.hostname.endsWith(".local")) return [];
          return [url.toString()];
        } catch {
          return [];
        }
      })
    ),
  ].slice(0, 8);
}

async function collectPage(
  raw: string,
  kind: "portfolio" | "social"
): Promise<{ source: string; fetched: boolean; pageText: string; imageUrls?: string[]; error?: string }> {
  const source = normalizeUrl(raw, kind === "social");
  if (!source) return { source: "", fetched: false, pageText: "", error: "Not provided" };
  try {
    const { url, html } = await fetchPublicHtml(source);
    return {
      source: url.toString(),
      fetched: true,
      pageText: pageText(html),
      ...(kind === "portfolio" ? { imageUrls: portfolioImages(html, url) } : {}),
    };
  } catch (error) {
    return {
      source,
      fetched: false,
      pageText: "",
      ...(kind === "portfolio" ? { imageUrls: [] } : {}),
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}

export async function collectExternalApplicantEvidence(
  portfolioRaw: string,
  socialRaw: string
): Promise<ExternalApplicantEvidence> {
  const [portfolio, social] = await Promise.all([
    collectPage(portfolioRaw, "portfolio"),
    collectPage(socialRaw, "social"),
  ]);
  return {
    portfolio: {
      ...portfolio,
      imageUrls: portfolio.imageUrls ?? [],
    },
    social,
  };
}
