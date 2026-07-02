"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

export function ApplyDock({
  slug,
  volumeNumber,
  spotsRemaining,
}: {
  slug: string;
  volumeNumber: number;
  spotsRemaining: number | null;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrolled = window.scrollY;
      // Hide once the footer / final CTA comes into view so the dock never
      // overlaps page content at the very bottom.
      const nearBottom =
        window.innerHeight + scrolled >= document.documentElement.scrollHeight - 220;
      setVisible(scrolled > window.innerHeight * 0.9 && !nearBottom);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const note =
    spotsRemaining !== null && spotsRemaining > 0
      ? `${spotsRemaining} spots left`
      : "Applications open";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:px-0"
        >
          <Link
            href={`/sessions/${slug}/apply`}
            className="flex items-center justify-between gap-4 border border-accent/40 bg-ink/90 px-5 py-3.5 shadow-2xl shadow-black/50 backdrop-blur-md transition-colors duration-300 hover:border-accent sm:gap-6"
          >
            <span className="flex flex-col">
              <span className="text-[0.6rem] tracking-[0.18em] text-accent uppercase">{note}</span>
              <span className="text-sm text-cream">Apply for Vol. {volumeNumber}</span>
            </span>
            <span className="text-accent">→</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
