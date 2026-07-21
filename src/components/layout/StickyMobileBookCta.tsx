"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { trackEngagement } from "@/lib/analytics-client";
import { cn } from "@/lib/utils";

/** Mobile sticky Book CTA — hidden on /book and when near footer / hero. */
export function StickyMobileBookCta() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      pathname === "/book" ||
      pathname.startsWith("/book") ||
      pathname === "/sessions" ||
      pathname.startsWith("/sessions/")
    ) {
      setVisible(false);
      return;
    }

    const onScroll = () => {
      const y = window.scrollY;
      const nearBottom =
        window.innerHeight + y >= document.documentElement.scrollHeight - 280;
      setVisible(y > 420 && !nearBottom);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  if (
    pathname === "/book" ||
    pathname.startsWith("/admin") ||
    pathname === "/sessions" ||
    pathname.startsWith("/sessions/")
  ) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-stone/30 bg-ink/95 p-3 backdrop-blur-md transition-transform duration-300 md:hidden",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <Link
        href="/book"
        onClick={() =>
          trackEngagement({ event: "cta_click", path: pathname, label: "sticky_mobile_book" })
        }
        className="flex min-h-12 w-full items-center justify-center bg-cream text-xs tracking-[0.18em] text-ink uppercase"
      >
        Book Your Experience
      </Link>
    </div>
  );
}
