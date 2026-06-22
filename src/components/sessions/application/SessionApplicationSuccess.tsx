"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatApplicationId } from "@/lib/session-application";

export function SessionApplicationSuccess({
  title,
  message,
  applicationId,
  volumeTitle,
}: {
  title: string;
  message: string;
  applicationId: string;
  volumeTitle: string;
}) {
  const [copied, setCopied] = useState(false);
  const displayId = formatApplicationId(applicationId);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(displayId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="border border-stone/30 bg-charcoal/20 p-8 md:p-12"
    >
      <p className="label-caps mb-4 text-center text-accent">Application Received</p>
      <h2 className="headline-md text-center">{title}</h2>
      <p className="body-lg mx-auto mt-4 max-w-xl text-center text-fog">{message}</p>

      <div className="mx-auto mt-10 max-w-md border border-stone/30 bg-ink/50 p-6 text-center">
        <p className="text-xs tracking-wide text-muted uppercase">Your application ID</p>
        <p className="mt-2 font-display text-3xl text-cream">{displayId}</p>
        <p className="mt-2 text-xs text-muted">Save this ID for your records — {volumeTitle}</p>
        <button
          type="button"
          onClick={copyId}
          className="mt-4 border border-stone/50 px-4 py-2 text-xs tracking-wide text-fog uppercase hover:border-cream/40 hover:text-cream"
        >
          {copied ? "Copied" : "Copy ID"}
        </button>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link href="/sessions" className="bg-cream px-6 py-3 text-xs tracking-[0.15em] text-ink uppercase">
          Back to Sessions
        </Link>
      </div>
    </motion.div>
  );
}
