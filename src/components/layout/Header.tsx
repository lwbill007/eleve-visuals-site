"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SiteConfig, NavLink } from "@/lib/types";
import { NAVIGATION } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { trackEngagement } from "@/lib/analytics-client";

interface HeaderProps {
  siteConfig: SiteConfig;
  navLinks?: NavLink[];
}

export function Header({ navLinks = [...NAVIGATION] }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || !menuRef.current) return;
    const menu = menuRef.current;
    const focusable = Array.from(
      menu.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
    );
    focusable[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 right-0 left-0 z-50 transition-all duration-500",
          scrolled || menuOpen
            ? "bg-ink/90 backdrop-blur-md border-b border-stone/20"
            : "bg-transparent"
        )}
        style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8 lg:px-12">
          <Link
            href="/"
            className="font-display text-xl tracking-wide text-cream md:text-2xl"
            aria-label="ÉLEVÉVISUALS home"
          >
            ÉLEVÉ
            <span className="ml-1 text-xs font-body tracking-[0.3em] text-fog uppercase">
              Visuals
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "label-caps link-underline text-[0.6rem]",
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? "text-cream"
                    : "text-fog hover:text-cream"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button
              variant="primary"
              size="sm"
              href="/book"
              onClick={() =>
                trackEngagement({ event: "cta_click", path: pathname, label: "nav_book" })
              }
            >
              Book
            </Button>
          </nav>

          <button
            ref={menuButtonRef}
            type="button"
            className="relative z-50 -mr-2 flex h-11 w-11 flex-col items-center justify-center gap-1.5 lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            <span
              className={cn(
                "block h-px w-6 bg-cream transition-all duration-300",
                menuOpen && "translate-y-[3.5px] rotate-45"
              )}
            />
            <span
              className={cn(
                "block h-px w-6 bg-cream transition-all duration-300",
                menuOpen && "-translate-y-[3.5px] -rotate-45"
              )}
            />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          ref={menuRef}
          id="mobile-nav"
          className="fixed inset-0 z-40 flex flex-col justify-center bg-ink lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <nav className="flex flex-col items-center gap-8" aria-label="Mobile">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "font-display text-3xl",
                pathname === item.href ? "text-cream" : "text-fog"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Button
            variant="primary"
            size="lg"
            href="/book"
            onClick={() =>
              trackEngagement({ event: "cta_click", path: pathname, label: "mobile_nav_book" })
            }
          >
            Book Your Experience
          </Button>
          </nav>
        </div>
      )}
    </>
  );
}
