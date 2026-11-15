import type { ReactNode } from "react";

interface P {
  className?: string;
}

const base = (children: ReactNode, className = "h-6 w-6") => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const SearchIcon = ({ className }: P) =>
  base(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>, className);
export const BagIcon = ({ className }: P) =>
  base(<><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>, className);
export const HeartIcon = ({ className, filled }: P & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className={className ?? "h-6 w-6"} aria-hidden="true">
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  </svg>
);
export const MenuIcon = ({ className }: P) => base(<><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>, className);
export const CloseIcon = ({ className }: P) => base(<><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>, className);
export const WhatsAppIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className ?? "h-6 w-6"} aria-hidden="true">
    <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M9 8c-.5 1 0 2.6 1.6 4.2S13.8 14.5 15 14l.8-1.2-1.7-1-.8.7c-.8-.3-1.8-1.2-2.2-2l.7-.8-1-1.7L9 8Z" fill="currentColor" />
  </svg>
);
