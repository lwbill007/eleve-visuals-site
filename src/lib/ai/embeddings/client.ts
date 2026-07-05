import { getAIConfig } from "../config";

const EMBEDDING_MODEL =
  process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small";

export function isEmbeddingConfigured(): boolean {
  return !!getAIConfig().openrouter.apiKey;
}

/** Deterministic local fallback when API embeddings are unavailable. */
export function localEmbed(text: string, dims = 256): number[] {
  const vec = new Array(dims).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  for (const token of tokens) {
    let h = 0;
    for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) >>> 0;
    const idx = h % dims;
    vec[idx] += 1;
    vec[(idx + 17) % dims] += 0.5;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const config = getAIConfig();
  if (!config.openrouter.apiKey) {
    return texts.map((t) => localEmbed(t));
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openrouter.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": config.openrouter.siteUrl,
        "X-Title": "ÉLEVÉ OS",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
    });

    if (!res.ok) {
      return texts.map((t) => localEmbed(t));
    }

    const data = (await res.json()) as {
      data?: { embedding?: number[]; index?: number }[];
    };
    const rows = data.data ?? [];
    if (rows.length !== texts.length) {
      return texts.map((t) => localEmbed(t));
    }
    return rows
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((r) => r.embedding ?? localEmbed(""));
  } catch {
    return texts.map((t) => localEmbed(t));
  }
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec ?? localEmbed(text);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}
