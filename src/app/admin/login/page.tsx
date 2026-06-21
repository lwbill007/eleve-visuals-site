"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "config") {
      setError(
        "Admin login is not configured on the server. Set AUTH_SECRET and ADMIN_PASSWORD in your environment variables."
      );
    }

    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { authenticated?: boolean; configured?: boolean }) => {
        if (data.authenticated) {
          router.replace("/admin");
          return;
        }
        if (data.configured === false && params.get("error") !== "config") {
          setError(
            "Admin login is not configured. Set AUTH_SECRET (32+ chars) and ADMIN_PASSWORD in your .env file."
          );
        }
      })
      .finally(() => setCheckingSession(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "Login failed");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <p className="text-sm text-fog">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl text-cream">ÉLEVÉ Admin</h1>
          <p className="mt-2 text-sm text-fog">Sign in to manage your site</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-cream-dim">
              Admin Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="field-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cream py-3.5 text-xs tracking-[0.15em] text-ink uppercase disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
