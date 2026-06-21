"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAVIGATION } from "@/lib/types";
import type { SiteConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  siteConfig: SiteConfig;
}

export function Header({ siteConfig }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
            aria-label={`${siteConfig.name} home`}
          >
            ÉLEVÉ
            <span className="ml-1 text-xs font-body tracking-[0.3em] text-fog uppercase">
              Visuals
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main">
            {NAVIGATION.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "label-caps link-underline text-[0.6rem]",
                  pathname === item.href ? "text-cream" : "text-fog hover:text-cream"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button variant="primary" size="sm" href="/book">
              Book
            </Button>
          </nav>

          <button
            type="button"
            className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
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

      <div
        className={cn(
          "fixed inset-0 z-40 flex flex-col justify-center bg-ink transition-opacity duration-500 lg:hidden",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!menuOpen}
      >
        <nav className="flex flex-col items-center gap-8" aria-label="Mobile">
          {NAVIGATION.map((item) => (
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
          <Button variant="primary" href="/book" className="mt-4">
            Book a Shoot
          </Button>
        </nav>
      </div>
    </>
  );
}
