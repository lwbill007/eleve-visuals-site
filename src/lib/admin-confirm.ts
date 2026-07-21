"use client";

/** Require the record name for irreversible admin deletion. */
export function confirmNamedDestructive(kind: string, name: string): boolean {
  const expected = name.trim();
  if (!expected) {
    return window.confirm(`Permanently delete this ${kind}? This cannot be undone.`);
  }

  const entered = window.prompt(
    `Permanently delete ${kind} “${expected}”? This cannot be undone.\n\nType “${expected}” to confirm.`
  );
  return entered?.trim() === expected;
}
