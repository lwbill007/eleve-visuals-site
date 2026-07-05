"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import type { PortfolioAnalysisResult } from "@/lib/ai/types";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";

export function PortfolioAssistantPanel({ portfolioId }: { portfolioId?: string }) {
  const [result, setResult] = useState<PortfolioAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    const res = await adminFetch("/api/admin/ai/portfolio/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portfolioId }),
    });
    setResult(res.ok ? await res.json() : null);
    setLoading(false);
  }

  return (
    <AdminPanel title="AI Portfolio Assistant" subtitle="Hero selection, alt text, duplicates, carousel order">
      <button
        type="button"
        onClick={analyze}
        disabled={loading}
        className="text-xs tracking-[0.12em] text-accent uppercase hover:text-cream disabled:opacity-50"
      >
        {loading ? "Analyzing images…" : "✦ Analyze portfolio"}
      </button>

      {result && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-cream-dim">
            Hero: <span className="text-accent">{result.heroRecommendation ? "Recommended" : "—"}</span>
            {result.duplicates.length > 0 && ` · ${result.duplicates.length} duplicate${result.duplicates.length === 1 ? "" : "s"}`}
          </p>
          {result.homepagePlacement && <p className="text-xs text-fog">{result.homepagePlacement}</p>}
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {result.images.slice(0, 8).map((img) => (
              <li key={img.url} className="rounded border border-stone/20 p-2 text-xs">
                <p className="text-cream">{img.suggestedHero ? "★ Hero" : `Image ${img.index + 1}`}</p>
                <p className="text-fog">{img.altText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminPanel>
  );
}
