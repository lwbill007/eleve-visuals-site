import type { SVGProps } from "react";

export type SessionIconName =
  | "check"
  | "doc"
  | "layers"
  | "compass"
  | "camera"
  | "users"
  | "cup"
  | "image"
  | "share"
  | "film"
  | "tag"
  | "star"
  | "sparkle"
  | "gift"
  | "gem"
  | "grid"
  | "lock"
  | "award"
  | "vault";

const PATHS: Record<SessionIconName, React.ReactNode> = {
  check: <path d="M4 12.5 9 17.5 20 6.5" />,
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8h3l2-3h8l2 3h3v11H3z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5M17 14c2.5.4 4.5 2.3 4.5 5" />
    </>
  ),
  cup: (
    <>
      <path d="M5 8h12v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" />
      <path d="M17 9h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M8 3v2M12 3v2" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <circle cx="8.5" cy="9.5" r="1.8" />
      <path d="m3 17 5-4 4 3 4-4 5 5" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 9h18M3 15h18M8 4v16M16 4v16" />
    </>
  ),
  tag: (
    <>
      <path d="M4 4h7l9 9-7 7-9-9z" />
      <circle cx="8.5" cy="8.5" r="1.4" />
    </>
  ),
  star: <path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 17l-5.3 2.6 1.1-6L3.4 9.4l6-.8z" />,
  sparkle: (
    <path d="M12 3c.6 4 1.9 5.4 6 6-4.1.6-5.4 2-6 6-.6-4-1.9-5.4-6-6 4.1-.6 5.4-2 6-6Z" />
  ),
  gift: (
    <>
      <path d="M4 9h16v3H4zM5 12h14v9H5zM12 9v12" />
      <path d="M12 9C9 9 7 4.5 9.5 4.5S12 7 12 9zM12 9c3 0 5-4.5 2.5-4.5S12 7 12 9z" />
    </>
  ),
  gem: (
    <>
      <path d="M6 4h12l3 5-9 11L3 9z" />
      <path d="M3 9h18M9 4 6.5 9 12 20M15 4l2.5 5L12 20" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" />
      <rect x="13.5" y="3.5" width="7" height="7" />
      <rect x="3.5" y="13.5" width="7" height="7" />
      <rect x="13.5" y="13.5" width="7" height="7" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="1" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m9 14-2 7 5-3 5 3-2-7" />
    </>
  ),
  vault: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8v1.5M12 14.5V16M8 12h1.5M14.5 12H16" />
    </>
  ),
};

export function SessionIcon({
  name,
  className,
  ...props
}: { name: SessionIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
