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

export function getTodayDateString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mapApiErrorsToForm<T extends object>(
  payload: { error?: string; details?: Record<string, string[] | undefined> },
  fallbackField: keyof T,
  rateLimited = false
): FormErrors<T> {
  if (rateLimited) {
    return {
      [fallbackField]: "Too many attempts. Please wait and try again.",
    } as FormErrors<T>;
  }

  if (payload.details) {
    const errors: FormErrors<T> = {};
    for (const [key, messages] of Object.entries(payload.details)) {
      if (messages?.[0]) {
        errors[key as keyof T] = messages[0];
      }
    }
    if (Object.keys(errors).length > 0) {
      return errors;
    }
  }

  return {
    [fallbackField]: payload.error || "Something went wrong. Please try again.",
  } as FormErrors<T>;
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
