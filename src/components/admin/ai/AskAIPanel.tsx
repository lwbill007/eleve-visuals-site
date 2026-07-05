"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { adminFetch } from "@/lib/admin-fetch";
import { PAGE_AI_PROMPTS } from "@/lib/ai/types";
import { useAIContext } from "./AIContextProvider";
import { cn } from "@/lib/utils";

export function AskAIPanel() {
  const { context, panelOpen, closePanel } = useAIContext();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const pageConfig = PAGE_AI_PROMPTS[context.page] || PAGE_AI_PROMPTS.general;

  useEffect(() => {
    if (panelOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [response, panelOpen]);

  useEffect(() => {
    if (!panelOpen) {
      setResponse("");
      setInput("");
    }
  }, [panelOpen]);

  async function ask(text: string) {
    if (!text.trim() || streaming) return;
    setStreaming(true);
    setResponse("");

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as { text?: string };
            if (parsed.text) {
              accumulated += parsed.text;
              setResponse(accumulated);
            }
          } catch {
            /* skip */
          }
        }
      }
    } catch {
      setResponse("Something went wrong. Check AI configuration or try again.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <AnimatePresence>
      {panelOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close AI panel"
            className="fixed inset-0 z-[250] bg-ink/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePanel}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-[260] flex w-full max-w-md flex-col border-l border-stone/25 bg-charcoal shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-stone/20 px-5 py-4">
              <div>
                <p className="label-caps text-accent">Ask ÉLEVÉ AI</p>
                <p className="text-xs text-muted">{pageConfig.label} context</p>
              </div>
              <button type="button" onClick={closePanel} className="text-fog hover:text-cream">
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function AskAIButton({ className }: { className?: string }) {
  const { openPanel } = useAIContext();
  return (
    <button
      type="button"
      onClick={openPanel}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs tracking-[0.1em] text-accent uppercase transition-colors hover:border-accent/50 hover:bg-accent/10",
        className
      )}
    >
      ✦ Ask AI
    </button>
  );
}
