"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import type { AIGenerateTask } from "@/lib/ai/types";

export function AIGeneratePanel({
  task,
  label,
  prompt,
  context,
  buttonLabel = "Generate with AI",
}: {
  task: AIGenerateTask;
  label: string;
  prompt: string;
  context?: Record<string, unknown>;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setOpen(true);
    setResult("");
    const res = await adminFetch("/api/admin/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, prompt, context }),
    });
    const data = res.ok ? await res.json() : { content: "Generation failed." };
    setResult(data.content ?? "");
    setLoading(false);
  }

  return (
    <div className="mt-4 border-t border-stone/20 pt-4">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="text-xs tracking-[0.12em] text-accent uppercase hover:text-cream disabled:opacity-50"
      >
        ✦ {loading ? "Generating…" : buttonLabel}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-stone/25 bg-ink/50 p-4">
          <p className="mb-2 text-[0.65rem] tracking-[0.14em] text-muted uppercase">{label} — DRAFT</p>
          {loading ? (
            <p className="text-sm text-fog animate-pulse">ÉLEVÉ AI is writing…</p>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-cream-dim">{result}</p>
          )}
          <p className="mt-3 text-[0.65rem] text-muted">Review before sending. AI never sends automatically.</p>
        </div>
      )}
    </div>
  );
}
