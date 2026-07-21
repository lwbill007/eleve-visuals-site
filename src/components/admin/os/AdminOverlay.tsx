"use client";

import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let overlayCount = 0;
let previousBodyOverflow = "";

export function AdminOverlay({
  open,
  onClose,
  title,
  description,
  children,
  variant = "dialog",
  className,
  initialFocusRef,
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: "dialog" | "sheet";
  className?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnBackdrop?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    overlayCount += 1;
    if (overlayCount === 1) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.querySelector<HTMLElement>("[data-admin-shell-root]")?.setAttribute("inert", "");
    }

    const focusTarget = initialFocusRef?.current ?? dialogRef.current;
    window.requestAnimationFrame(() => focusTarget?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
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

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      overlayCount = Math.max(0, overlayCount - 1);
      if (overlayCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.querySelector<HTMLElement>("[data-admin-shell-root]")?.removeAttribute("inert");
      }
      previousFocusRef.current?.focus();
    };
  }, [close, initialFocusRef, open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[400] flex bg-ink/80 backdrop-blur-md",
        variant === "dialog"
          ? "items-start justify-center p-4 pt-[max(3rem,12vh)]"
          : "items-stretch justify-end"
      )}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "overflow-hidden border border-stone/30 bg-charcoal shadow-2xl outline-none motion-reduce:transition-none",
          variant === "dialog"
            ? "w-full max-w-xl rounded-xl"
            : "h-full w-full max-w-md border-y-0 border-r-0",
          className
        )}
      >
        <span id={titleId} className="sr-only">
          {title}
        </span>
        {description ? (
          <span id={descriptionId} className="sr-only">
            {description}
          </span>
        ) : null}
        {children}
      </div>
    </div>,
    document.body
  );
}
