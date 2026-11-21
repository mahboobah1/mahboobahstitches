import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Notice, SelectField, TextAreaField, type Msg } from "../components/admin/kit";
import { FormError, FormField } from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { MEASURE_LABELS } from "../lib/bespokeStatus";
import { shrinkImage } from "../lib/image";
import { usePageMeta } from "../lib/usePageMeta";
import { generalEnquiryLink } from "../lib/whatsapp";

interface Photo { id: string; url: string }

export default function BespokePage() {
  usePageMeta("Bespoke tailoring", "Request a custom-made outfit: describe your design, add photos and measurements.");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<{ outfits: string[]; measurements: string[]; maxPhotos: number } | null>(null);
  const [f, setF] = useState({ name: "", email: "", phone: "", category: "", description: "", fabric: "", colour: "", deadline: "", notes: "", unit: "cm" });
  const [m, setM] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { api<{ outfits: string[]; measurements: string[]; maxPhotos: number }>("/api/bespoke/config").then(setCfg).catch((e) => setError(e instanceof Error ? e.message : "Could not load the form.")); }, []);
  useEffect(() => { if (user) setF((p) => ({ ...p, name: p.name || user.fullName, email: p.email || user.email })); }, [user]);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const addPhotos = async (files: FileList | null) => {
    if (!files || !cfg) return;
    setUploading(true);
    setMsg(null);
    try {
      for (const file of Array.from(files)) {
        if (photos.length >= cfg.maxPhotos) { setMsg({ ok: false, text: `You can add up to ${cfg.maxPhotos} photos.` }); break; }
        const dataBase64 = await shrinkImage(file);
        const r = await api<{ id: string; url: string }>("/api/bespoke/uploads", { method: "POST", body: { mime: "image/jpeg", dataBase64 } });
        setPhotos((p) => [...p, r]);
      }
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Upload failed." }); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const r = await api<{ reference: string; token: string }>("/api/bespoke", {
        method: "POST",
        body: { ...f, deadline: f.deadline || undefined, measurements: m, photoIds: photos.map((p) => p.id) },
      });
      navigate(`/bespoke/request/${r.reference}?token=${r.token}&new=1`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send your request."); setBusy(false); }
  };

  if (!cfg) return <div className="wrap py-20 text-center">{error ? <FormError message={error} /> : <p role="status">Loading…</p>}</div>;
  return (
    <div className="wrap max-w-2xl py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Bespoke tailoring</h1>
      <p className="mt-3 text-royal/80">Tell us about the outfit you would like. We will review it, ask any questions, and send you a quotation to approve. Nothing is charged until you approve.</p>
      <form onSubmit={submit} className="mt-8 space-y-6" noValidate>
        <h2 className="!text-2xl">Your details</h2>
        <FormField label="Full name" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} required />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Email" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} required />
          <FormField label="Phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} required />
        </div>

        <h2 className="!text-2xl pt-2">The outfit</h2>
        <SelectField label="What would you like made?" value={f.category} onChange={(e) => set("category", e.target.value)} required>
          <option value="">Choose one</option>
          {cfg.outfits.map((o) => <option key={o} value={o}>{o}</option>)}
        </SelectField>
        <TextAreaField label="Describe your design" value={f.description} maxLength={2000} rows={5} onChange={(e) => set("description", e.target.value)} hint="Style, sleeves, length, details you like. The more you tell us, the better." />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Preferred fabric (optional)" value={f.fabric} maxLength={120} onChange={(e) => set("fabric", e.target.value)} />
          <FormField label="Preferred colour (optional)" value={f.colour} maxLength={80} onChange={(e) => set("colour", e.target.value)} />
        </div>

        <div>
          <p className="mb-1 text-sm">Reference photos (optional, up to {cfg.maxPhotos})</p>
          <ul className="flex flex-wrap gap-3">
            {photos.map((p) => (
              <li key={p.id} className="relative">
                <img src={p.url} alt="Your reference" className="h-24 w-20 bg-powder object-cover" />
                <button type="button" aria-label="Remove photo" className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-royal text-cream" onClick={() => setPhotos((x) => x.filter((y) => y.id !== p.id))}>×</button>
              </li>
            ))}
          </ul>
          <input ref={fileRef} id="ref-photos" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void addPhotos(e.target.files)} />
          <label htmlFor="ref-photos" className={`btn-ghost mt-3 cursor-pointer ${uploading || photos.length >= cfg.maxPhotos ? "opacity-60" : ""}`}>{uploading ? "Uploading…" : "Add photos"}</label>
          <Notice msg={msg} />
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <h2 className="!text-2xl">Measurements (optional)</h2>
            <div className="w-28"><SelectField label="Unit" value={f.unit} onChange={(e) => set("unit", e.target.value)}><option value="cm">cm</option><option value="in">inches</option></SelectField></div>
          </div>
          <p className="mt-1 text-sm text-royal/75">Not sure? Skip this and <a className="link-line" href="/bookings">book a measurements appointment</a> instead.</p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {cfg.measurements.map((k) => <FormField key={k} label={MEASURE_LABELS[k] ?? k} inputMode="decimal" value={m[k] ?? ""} onChange={(e) => setM({ ...m, [k]: e.target.value })} />)}
          </div>
        </div>

        <FormField label="Delivery deadline (optional)" type="date" min={tomorrow} value={f.deadline} onChange={(e) => set("deadline", e.target.value)} hint="When do you need it by? We will tell you if that is possible." />
        <TextAreaField label="Anything else we should know? (optional)" value={f.notes} maxLength={1000} rows={3} onChange={(e) => set("notes", e.target.value)} />
        <FormError message={error} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn-primary" disabled={busy || uploading}>{busy ? "Sending…" : "Send my request"}</button>
          <a href={generalEnquiryLink("I would like a custom-made outfit.")} target="_blank" rel="noopener noreferrer" className="link-line text-sm">Prefer WhatsApp?</a>
        </div>
      </form>
    </div>
  );
}
