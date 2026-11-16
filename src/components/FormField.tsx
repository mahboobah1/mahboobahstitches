import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function FormField({ label, hint, id, ...rest }: Props) {
  const fid = id ?? `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={fid} className="mb-1 block text-sm">
        {label}
      </label>
      <input id={fid} className="field" aria-describedby={hint ? `${fid}-hint` : undefined} {...rest} />
      {hint && (
        <p id={`${fid}-hint`} className="mt-1 text-xs text-royal/70">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="border border-[#9b2c2c]/40 bg-[#9b2c2c]/5 p-3 text-sm text-[#9b2c2c]">
      {message}
    </p>
  );
}
