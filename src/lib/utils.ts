import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidInstagram(handle: string): boolean {
  if (!handle) return true;
  const cleaned = handle.replace(/^@/, "");
  return /^[a-zA-Z0-9._]{1,30}$/.test(cleaned);
}

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
