"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import GalleryUploader from "./GalleryUploader";

type Step = "details" | "settings" | "upload" | "publish";

/**
 * Create → settings → upload → publish.
 *
 * The gallery row is created at the end of step 2 because uploads need a
 * gallery id to key their storage against. It is created as a draft, so a flow
 * abandoned at step 3 leaves an unpublished gallery the photographer can finish
 * later rather than orphaned files nobody can reach.
 */
export default function GalleryCreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<Step>("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    title: "",
    sessionType: "",
    description: "",
    expiresAt: "",
    downloadEnabled: true,
    downloadQuality: "high" as "web" | "high",
    allowDownloadOriginals: false,
    favoriteEnabled: true,
    commentsEnabled: false,
    watermarkEnabled: false,
  });

  const [created, setCreated] = useState<{ id: string; slug: string; code: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function createGallery() {
    setBusy(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't create the gallery.");
      setCreated({ id: body.gallery.id, slug: body.gallery.slug, code: body.accessCode });
      setStep("upload");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the gallery.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!created) return;
    setBusy(true);
    try {
      const res = await adminFetch(`/api/admin/galleries/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (!res.ok) throw new Error("Couldn't publish.");
      setStep("publish");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't publish.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New gallery"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/90 p-4 backdrop-blur-sm sm:p-10"
    >
      <div className="w-full max-w-2xl border border-stone bg-charcoal p-6 sm:p-10">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="font-body text-[0.58rem] uppercase tracking-[0.3em] text-accent">
              {step === "details"
                ? "Step 1 — Client"
                : step === "settings"
                  ? "Step 2 — Settings"
                  : step === "upload"
                    ? "Step 3 — Upload"
                    : "Ready to send"}
            </p>
            <h2 className="mt-3 font-display text-2xl font-light tracking-wide text-cream">
              {step === "publish" ? "Gallery published" : "New gallery"}
            </h2>
          </div>
          <button
            type="button"
            onClick={step === "publish" ? onCreated : onClose}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center text-muted transition-colors hover:text-cream"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.3}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {error ? (
          <p role="alert" className="mb-6 border border-accent/40 px-4 py-3 font-body text-sm text-accent">
            {error}
          </p>
        ) : null}

        {step === "details" ? (
          <div className="space-y-5">
            <Field label="Client name">
              <Input value={form.clientName} onChange={(v) => set("clientName", v)} autoFocus />
            </Field>
            <Field label="Client email" hint="Used for the delivery message. Never shown publicly.">
              <Input type="email" value={form.clientEmail} onChange={(v) => set("clientEmail", v)} />
            </Field>
            <Field label="Gallery title">
              <Input
                value={form.title}
                onChange={(v) => set("title", v)}
                placeholder="ÉLEVÉ Signature"
              />
            </Field>
            <Field label="Session type">
              <Input value={form.sessionType} onChange={(v) => set("sessionType", v)} />
            </Field>
            <Field label="Description" hint="Shown under the title on the client's gallery.">
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                className="w-full border border-stone bg-transparent px-4 py-3 font-body text-sm text-cream outline-none focus-visible:border-accent"
              />
            </Field>

            <Actions
              onCancel={onClose}
              onNext={() => setStep("settings")}
              nextLabel="Settings"
              nextDisabled={!form.title.trim()}
            />
          </div>
        ) : null}

        {step === "settings" ? (
          <div className="space-y-5">
            <Field label="Expires" hint="Leave empty to keep the gallery available indefinitely.">
              <Input type="date" value={form.expiresAt} onChange={(v) => set("expiresAt", v)} />
            </Field>

            <Toggle
              label="Allow downloads"
              checked={form.downloadEnabled}
              onChange={(v) => set("downloadEnabled", v)}
            />
            {form.downloadEnabled ? (
              <Field label="Download quality">
                <select
                  value={form.downloadQuality}
                  onChange={(e) => set("downloadQuality", e.target.value as "web" | "high")}
                  className="w-full border border-stone bg-ink px-4 py-3 font-body text-sm text-cream outline-none focus-visible:border-accent"
                >
                  <option value="web">Web resolution — for sharing online</option>
                  <option value="high">High resolution — for printing</option>
                </select>
              </Field>
            ) : null}

            <Toggle
              label="Allow original files"
              hint="Off unless this client has been promised source files. Originals cannot be un-delivered."
              checked={form.allowDownloadOriginals}
              onChange={(v) => set("allowDownloadOriginals", v)}
            />
            <Toggle
              label="Favourites"
              checked={form.favoriteEnabled}
              onChange={(v) => set("favoriteEnabled", v)}
            />
            <Toggle
              label="Comments / proofing"
              checked={form.commentsEnabled}
              onChange={(v) => set("commentsEnabled", v)}
            />

            <Actions
              onCancel={() => setStep("details")}
              cancelLabel="Back"
              onNext={createGallery}
              nextLabel={busy ? "Creating" : "Create and upload"}
              nextDisabled={busy}
            />
          </div>
        ) : null}

        {step === "upload" && created ? (
          <div>
            <GalleryUploader galleryId={created.id} />
            <Actions
              onCancel={onCreated}
              cancelLabel="Finish later"
              onNext={publish}
              nextLabel={busy ? "Publishing" : "Publish gallery"}
              nextDisabled={busy}
            />
          </div>
        ) : null}

        {step === "publish" && created ? (
          <SharePanel slug={created.slug} code={created.code} onDone={onCreated} />
        ) : null}
      </div>
    </div>
  );
}

function SharePanel({
  slug,
  code,
  onDone,
}: {
  slug: string;
  code: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState("");
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/gallery/${slug}` : `/gallery/${slug}`;

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  }

  const message = `Your gallery is ready.\n\n${url}\nAccess code: ${code}`;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-body text-[0.58rem] uppercase tracking-[0.28em] text-muted">Gallery link</p>
        <p className="mt-2 break-all font-body text-sm text-cream">{url}</p>
      </div>
      <div>
        <p className="font-body text-[0.58rem] uppercase tracking-[0.28em] text-muted">Access code</p>
        <p className="mt-2 font-display text-2xl tracking-[0.3em] text-accent">{code}</p>
        <p className="mt-3 font-body text-xs text-muted">
          This is the only time the code is shown. It is stored hashed — you can regenerate it, but
          it cannot be looked up.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <CopyButton label="Copy link" active={copied === "link"} onClick={() => copy("link", url)} />
        <CopyButton label="Copy code" active={copied === "code"} onClick={() => copy("code", code)} />
        <CopyButton
          label="Copy client message"
          active={copied === "message"}
          onClick={() => copy("message", message)}
        />
      </div>

      <button
        type="button"
        onClick={onDone}
        className="w-full border border-stone px-6 py-3 font-body text-[0.6rem] uppercase tracking-[0.3em] text-cream transition-colors hover:border-accent hover:text-accent"
      >
        Done
      </button>
    </div>
  );
}

function CopyButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-5 py-2.5 font-body text-[0.58rem] uppercase tracking-[0.26em] transition-colors ${
        active ? "border-accent text-accent" : "border-stone text-cream hover:border-accent hover:text-accent"
      }`}
    >
      {active ? "Copied" : label}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-body text-[0.58rem] uppercase tracking-[0.28em] text-muted">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-2 font-body text-xs text-stone">{hint}</p> : null}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-stone bg-transparent px-4 py-3 font-body text-sm text-cream outline-none transition-colors placeholder:text-stone focus-visible:border-accent"
    />
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
      />
      <span>
        <span className="font-body text-sm text-cream">{label}</span>
        {hint ? <span className="mt-1 block font-body text-xs text-stone">{hint}</span> : null}
      </span>
    </label>
  );
}

function Actions({
  onCancel,
  cancelLabel = "Cancel",
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-8 flex justify-between gap-4 border-t border-stone pt-6">
      <button
        type="button"
        onClick={onCancel}
        className="font-body text-[0.6rem] uppercase tracking-[0.28em] text-muted transition-colors hover:text-cream"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="border border-stone px-7 py-3 font-body text-[0.6rem] uppercase tracking-[0.28em] text-cream transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  );
}
