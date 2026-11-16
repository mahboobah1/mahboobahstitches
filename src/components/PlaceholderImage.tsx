/**
 * Shown only while a product has no photo yet. It is clearly labelled and never passed off as a real
 * product photo. Photos are uploaded in Admin > Products.
 */
interface Props {
  label: string;
  tone?: "powder" | "cream" | "royal";
  className?: string;
  showLabel?: boolean;
}

const tones = {
  powder: { bg: "#DCE5EF", fg: "#183B63" },
  cream: { bg: "#EBE3D3", fg: "#183B63" },
  royal: { bg: "#183B63", fg: "#F5F0E6" },
};

export function PlaceholderImage({ label, tone = "powder", className = "", showLabel = true }: Props) {
  const t = tones[tone];
  return (
    <div
      role="img"
      aria-label={`Photo coming soon: ${label}`}
      className={`relative flex items-end justify-start overflow-hidden ${className}`}
      style={{ backgroundColor: t.bg, color: t.fg }}
    >
      <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full opacity-25" aria-hidden="true">
        <path d="M50 18c-7 0-12 6-12 13 0 5 2 8 4 11-14 6-22 20-22 40v38h60v-38c0-20-8-34-22-40 2-3 4-6 4-11 0-7-5-13-12-13Z" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 2.5" />
      </svg>
      {showLabel && (
        <span className="relative m-3 rounded-sm bg-white/80 px-2 py-1 text-xs text-royal">
          Photo coming soon
        </span>
      )}
    </div>
  );
}
