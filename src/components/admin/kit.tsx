import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export interface Msg {
  ok: boolean;
  text: string;
}

export function Notice({ msg }: { msg: Msg | null }) {
  if (!msg) return <div className="min-h-[1.5rem]" aria-live="polite" />;
  return (
    <p role={msg.ok ? "status" : "alert"} aria-live="polite" className={`min-h-[1.5rem] text-sm ${msg.ok ? "text-[#1f6b45]" : "text-[#9b2c2c]"}`}>
      {msg.text}
    </p>
  );
}

const idOf = (label: string) => `a-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export function SelectField({ label, children, ...rest }: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = rest.id ?? idOf(label);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm">{label}</label>
      <select id={id} className="field" {...rest}>{children}</select>
    </div>
  );
}

export function TextAreaField({ label, hint, ...rest }: { label: string; hint?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = rest.id ?? idOf(label);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm">{label}</label>
      <textarea id={id} className="field min-h-[7rem]" {...rest} />
      {hint && <p className="mt-1 text-xs text-royal/70">{hint}</p>}
    </div>
  );
}

export function CheckField({ label, ...rest }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex min-h-[44px] items-center gap-3 text-sm">
      <input type="checkbox" className="h-5 w-5 accent-[#183B63]" {...rest} />
      {label}
    </label>
  );
}

export function Badge({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "good" | "warn" }) {
  const cls = tone === "good" ? "bg-[#1f6b45]/10 text-[#1f6b45]" : tone === "warn" ? "bg-gold/25 text-royal-deep" : "bg-royal/10 text-royal";
  return <span className={`inline-block rounded-sm px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

export const errText = (e: unknown, fallback = "Something went wrong.") => (e instanceof Error ? e.message : fallback);
