import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { CloseIcon } from "../Icons";
import { errText } from "./kit";

interface LibraryImage { path: string; name: string; alt: string; kb: number }
interface UploadedImage { id: string; url: string; bytes: number }
export interface Picked { url: string; alt: string }

/**
 * Full-screen chooser for photos. "Website library" = photos you uploaded to public/images on GitHub
 * (the list is rebuilt on every deploy). "Phone uploads" = photos uploaded through the admin.
 */
export function ImagePicker({ onPick, onClose }: { onPick: (p: Picked) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"library" | "uploads">("library");
  const [lib, setLib] = useState<LibraryImage[] | null>(null);
  const [ups, setUps] = useState<UploadedImage[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    fetch("/images/manifest.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("The photo list is not available yet. It is created on each deploy."))))
      .then((d: { images: LibraryImage[] }) => setLib(d.images))
      .catch((e) => {
        setLib([]);
        setError(errText(e));
      });
    api<{ items: UploadedImage[] }>("/api/admin/media").then((d) => setUps(d.items)).catch(() => setUps([]));
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (lib ?? []).filter((i) => !s || `${i.name} ${i.alt}`.toLowerCase().includes(s));
  }, [lib, q]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Choose a photo" className="fixed inset-0 z-[60] flex flex-col bg-cream">
      <div className="flex items-center justify-between border-b border-gold/50 px-4 py-3">
        <h2 className="!text-2xl">Choose a photo</h2>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-royal/5">
          <CloseIcon />
        </button>
      </div>
      <div className="border-b border-dashed border-gold/60 px-4 py-3">
        <div className="flex gap-2" role="tablist" aria-label="Photo source">
          {(["library", "uploads"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`btn border ${tab === t ? "border-royal bg-royal text-cream" : "border-royal/30"}`}>
              {t === "library" ? `Website library${lib ? ` (${lib.length})` : ""}` : `Phone uploads${ups ? ` (${ups.length})` : ""}`}
            </button>
          ))}
        </div>
        {tab === "library" && (
          <input type="search" className="field mt-3 max-w-sm" placeholder="Search photos" aria-label="Search photos" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && tab === "library" && <p role="alert" className="mb-3 text-sm text-[#9b2c2c]">{error}</p>}
        {tab === "library" && (
          <>
            {lib === null && <p role="status">Loading…</p>}
            {lib && shown.length === 0 && !error && <p>No photos match.</p>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {shown.map((i) => (
                <li key={i.path}>
                  <button type="button" className="block w-full text-left" onClick={() => onPick({ url: i.path, alt: i.alt })}>
                    <img src={i.path} alt="" loading="lazy" className="aspect-[4/5] w-full bg-powder object-cover object-bottom" />
                    <span className="mt-1 block truncate text-xs">{i.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {tab === "uploads" && (
          <>
            {ups === null && <p role="status">Loading…</p>}
            {ups && ups.length === 0 && <p>No photos have been uploaded from the phone yet. Upload one from a product page.</p>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {ups?.map((i) => (
                <li key={i.id}>
                  <button type="button" className="block w-full text-left" onClick={() => onPick({ url: i.url, alt: "" })}>
                    <img src={i.url} alt="" loading="lazy" className="aspect-[4/5] w-full bg-powder object-cover" />
                    <span className="mt-1 block text-xs">{Math.round(i.bytes / 1024)} KB</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

/** A small "current picture + Choose / Remove" control used on settings and collection screens. */
export function PictureField({ label, value, onChange, hint }: { label: string; value: string; onChange: (url: string) => void; hint?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="mb-1 text-sm">{label}</p>
      <div className="flex items-start gap-3">
        {value ? (
          <img src={value} alt="" className="h-28 w-[5.6rem] shrink-0 bg-powder object-cover object-bottom" />
        ) : (
          <div className="flex h-28 w-[5.6rem] shrink-0 items-center justify-center border border-dashed border-gold text-xs text-royal/60">None</div>
        )}
        <div className="flex flex-col items-start gap-2">
          <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>{value ? "Change photo" : "Choose a photo"}</button>
          {value && <button type="button" className="link-line text-sm" onClick={() => onChange("")}>Remove</button>}
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-royal/70">{hint}</p>}
      {open && <ImagePicker onClose={() => setOpen(false)} onPick={(p) => { onChange(p.url); setOpen(false); }} />}
    </div>
  );
}
