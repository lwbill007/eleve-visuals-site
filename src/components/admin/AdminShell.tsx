"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Portfolio", href: "/admin/portfolio" },
  { label: "Services", href: "/admin/services" },
  { label: "Testimonials", href: "/admin/testimonials" },
  { label: "Site Content", href: "/admin/content" },
  { label: "Submissions", href: "/admin/submissions" },
];

export function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ink lg:flex">
      <aside className="border-b border-stone/30 lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="p-6">
          <Link href="/admin" className="font-display text-xl text-cream">
            ÉLEVÉ Admin
          </Link>
          <p className="mt-1 text-xs text-muted">Content management</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-4 pb-4 lg:flex-col lg:px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "bg-charcoal text-cream"
                  : "text-fog hover:text-cream"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-stone/20 p-4 lg:block">
          <Link href="/" className="mb-3 block text-xs text-fog hover:text-cream">
            ← View site
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-xs text-muted hover:text-cream"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-stone/30 px-6 py-5 lg:px-10">
          <h1 className="font-display text-2xl text-cream">{title || "Dashboard"}</h1>
          <div className="flex items-center gap-4 lg:hidden">
            <Link href="/" className="text-xs text-fog">View site</Link>
            <button type="button" onClick={logout} className="text-xs text-muted">
              Sign out
            </button>
          </div>
        </header>
        <div className="p-6 lg:p-10">{children}</div>
      </div>
    </div>
  );
}
