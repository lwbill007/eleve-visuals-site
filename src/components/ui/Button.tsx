import Link from "next/link";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  href: string;
  children: React.ReactNode;
  className?: string;
}

const variants = {
  primary:
    "bg-cream text-ink hover:bg-cream-dim border border-cream",
  secondary:
    "bg-transparent text-cream border border-stone hover:border-cream/40 hover:bg-white/5",
  ghost:
    "bg-transparent text-cream hover:text-accent border border-transparent",
  outline:
    "bg-transparent text-cream border border-accent/40 hover:border-accent hover:bg-accent/5",
};

const sizes = {
  sm: "px-5 py-2.5 text-xs tracking-[0.15em] uppercase",
  md: "px-7 py-3.5 text-xs tracking-[0.15em] uppercase",
  lg: "px-9 py-4 text-xs tracking-[0.15em] uppercase",
};

export function Button({
  variant = "primary",
  size = "md",
  href,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-500",
        variants[variant],
        sizes[size],
        className
      )}
      style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
      {...props}
    >
      {children}
    </Link>
  );
}

interface SubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SubmitButton({
  variant = "primary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const variantClass =
    variant === "primary"
      ? "bg-cream text-ink hover:bg-cream-dim border border-cream disabled:opacity-50"
      : "bg-transparent text-cream border border-stone hover:border-cream/40 disabled:opacity-50";

  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        "inline-flex w-full items-center justify-center font-medium transition-all duration-500 sm:w-auto",
        variantClass,
        sizes[size],
        className
      )}
      style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
      {...props}
    >
      {loading ? "Sending..." : children}
    </button>
  );
}
