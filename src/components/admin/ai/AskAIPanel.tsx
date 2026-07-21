"use client";

import { useEffect, useRef, useState } from "react";
import { AdminOverlay } from "@/components/admin/os/AdminOverlay";
import { adminFetch } from "@/lib/admin-fetch";
import { parseContextStreamPayload } from "@/lib/ai/context-stream";
import type { AIWorkflowMode } from "@/lib/ai/prompts/workflows";
import { PAGE_AI_PROMPTS } from "@/lib/ai/types";
import { useAIContext } from "./AIContextProvider";
import { cn } from "@/lib/utils";

const STANDARD_WORKFLOW: { mode: AIWorkflowMode; label: string } = {
  mode: "standard",
  label: "Standard",
};

export function AskAIPanel() {
  const { context, panelOpen, closePanel } = useAIContext();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [workflow, setWorkflow] = useState(STANDARD_WORKFLOW);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pageConfig = PAGE_AI_PROMPTS[context.page] || PAGE_AI_PROMPTS.general;

  useEffect(() => {
    if (panelOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response, panelOpen]);

  useEffect(() => {
    if (!panelOpen) {
      setResponse("");
      setInput("");
      setWorkflow(STANDARD_WORKFLOW);
    }
  }, [panelOpen]);

  async function ask(text: string) {
    if (!text.trim() || streaming) return;
    setStreaming(true);
    setResponse("");
    setWorkflow(STANDARD_WORKFLOW);

    try {
      const res = await adminFetch("/api/admin/ai/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      const consumeLine = (line: string) => {
        if (!line.startsWith("data: ")) return;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") return;
        try {
          const event = parseContextStreamPayload(JSON.parse(payload));
          if (event?.type === "mode") {
            setWorkflow({ mode: event.mode, label: event.label });
          } else if (event?.type === "text") {
            accumulated += event.text;
            setResponse(accumulated);
          } else if (event?.type === "error") {
            setResponse(
              accumulated
                ? `${accumulated}\n\nAI response interrupted. Please try again.`
                : "AI response interrupted. Please try again."
            );
          }
        } catch {
          // A malformed event must not discard valid events that follow it.
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(consumeLine);
      }
      buffer += decoder.decode();
      if (buffer) consumeLine(buffer);
    } catch {
      setResponse("Something went wrong. Check AI configuration or try again.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <AdminOverlay
      open={panelOpen}
      onClose={closePanel}
      title="Ask ÉLEVÉ AI"
      description={`${pageConfig.label} workspace context`}
      variant="sheet"
      className="flex flex-col"
      initialFocusRef={inputRef}
    >
            <div className="flex items-center justify-between border-b border-stone/20 px-5 py-4">
              <div>
                <p className="label-caps text-accent">Ask ÉLEVÉ AI</p>
                <p className="text-xs text-muted">{pageConfig.label} context</p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close AI panel"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-fog hover:bg-ink/40 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-wrap gap-2">
                {pageConfig.prompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setInput(p);
                      ask(p);
                    }}
                    className="rounded-full border border-stone/30 px-3 py-1.5 text-xs text-fog transition-colors hover:border-accent/40 hover:text-cream"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {(response || streaming) && (
                <div className="mt-5 rounded-xl border border-stone/20 bg-ink/50 p-4">
                  {workflow.mode !== "standard" ? (
                    <div
                      className="mb-3 inline-flex rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[0.58rem] tracking-[0.12em] text-accent uppercase"
                      role="status"
                    >
                      {workflow.label} · Draft only
                    </div>
                  ) : null}
                  {streaming && !response && (
                    <p className="text-sm text-fog animate-pulse">Analyzing with page context…</p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-dim">{response}</p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              className="border-t border-stone/20 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask about ${pageConfig.label.toLowerCase()}…`}
                  disabled={streaming}
                  className="min-w-0 flex-1 rounded-lg border border-stone/30 bg-ink/40 px-3 py-2.5 text-sm text-cream outline-none focus:border-accent/50 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={streaming || !input.trim()}
                  className={cn(
                    "shrink-0 rounded-lg px-4 py-2.5 text-xs tracking-[0.1em] uppercase",
                    "bg-cream text-ink hover:bg-accent disabled:opacity-40"
                  )}
                >
                  Ask
                </button>
              </div>
              <p className="mt-2 text-[0.65rem] text-muted">Drafts require review before sending.</p>
            </form>
    </AdminOverlay>
  );
}

export function AskAIButton({ className }: { className?: string }) {
  const { openPanel } = useAIContext();
  return (
    <button
      type="button"
      onClick={openPanel}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs tracking-[0.1em] text-accent uppercase transition-colors hover:border-accent/50 hover:bg-accent/10",
        className
      )}
    >
      ✦ Ask AI
    </button>
  );
}
