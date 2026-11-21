import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { SlotPicker } from "../components/booking/SlotPicker";
import { FormError, FormField } from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { fmtWhen } from "../lib/bookingTime";
import { usePageMeta } from "../lib/usePageMeta";
import { generalEnquiryLink } from "../lib/whatsapp";

interface Config { types: { id: string; name: string; durationMinutes: number; description: string | null }[]; hasAvailability: boolean; maxDaysAhead: number; cancelHours: number; autoConfirm: boolean; tzOffsetMinutes: number }

export default function BookingsPage() {
  usePageMeta("Book a fitting", "Book a consultation, measurements, fitting or design discussion.");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [typeId, setTypeId] = useState("");
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [f, setF] = useState({ name: "", email: "", phone: "", notes: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<Config>("/api/bookings/config").then(setCfg).catch((e) => setError(e instanceof Error ? e.message : "Could not load booking times.")); }, []);
  useEffect(() => { if (user) setF((p) => ({ ...p, name: p.name || user.fullName, email: p.email || user.email })); }, [user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!startsAt) return;
    setError("");
    setBusy(true);
    try {
      const r = await api<{ reference: string; token: string }>("/api/bookings", { method: "POST", body: { typeId, startsAt, ...f } });
      navigate(`/bookings/${r.reference}?token=${r.token}&new=1`);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not book."); setBusy(false); }
  };

  if (!cfg) return <div className="wrap py-20 text-center">{error ? <FormError message={error} /> : <p role="status">Loading…</p>}</div>;
  if (!cfg.hasAvailability || cfg.types.length === 0) {
    return (
      <div className="wrap max-w-xl py-16 text-center">
        <h1 className="text-4xl">Book a fitting</h1>
        <p className="mt-4 text-royal/85">Online booking times will be available soon. Message us to arrange a time in the meantime.</p>
        <a href={generalEnquiryLink("I would like to book a consultation or fitting.")} target="_blank" rel="noopener noreferrer" className="btn-primary mt-7">Ask on WhatsApp</a>
      </div>
    );
  }
  const type = cfg.types.find((t) => t.id === typeId);
  return (
    <div className="wrap max-w-2xl py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Book a fitting</h1>
      <p className="mt-3 text-royal/80">Choose what you need, then a day and time that suits you.</p>

      <fieldset className="mt-8">
        <legend className="mb-3 !text-2xl font-display">1. What would you like?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {cfg.types.map((t) => (
            <button key={t.id} type="button" aria-pressed={typeId === t.id} onClick={() => { setTypeId(t.id); setStartsAt(null); }}
              className={`border p-4 text-left ${typeId === t.id ? "border-royal bg-royal text-cream" : "border-gold hover:bg-royal/5"}`}>
              <span className="font-display text-xl">{t.name}</span>
              <span className="block text-sm opacity-80">{t.durationMinutes} minutes</span>
              {t.description && <span className="mt-1 block text-sm opacity-80">{t.description}</span>}
            </button>
          ))}
        </div>
      </fieldset>

      {type && (
        <section className="mt-10" aria-labelledby="when">
          <h2 id="when" className="!text-2xl">2. Pick a day and time</h2>
          <div className="mt-4"><SlotPicker typeId={type.id} tz={cfg.tzOffsetMinutes} value={startsAt} onChange={setStartsAt} /></div>
        </section>
      )}

      {type && startsAt && (
        <form onSubmit={submit} className="mt-10 space-y-5" noValidate>
          <h2 className="!text-2xl">3. Your details</h2>
          <p className="border border-dashed border-gold p-3 text-sm" role="status">{type.name} · {fmtWhen(startsAt, cfg.tzOffsetMinutes)} · {type.durationMinutes} minutes</p>
          <FormField label="Full name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
            <FormField label="Phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required />
          </div>
          <FormField label="Anything we should know? (optional)" value={f.notes} maxLength={500} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <FormError message={error} />
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={busy}>{busy ? "Booking…" : cfg.autoConfirm ? "Confirm my booking" : "Request this time"}</button>
          <p className="text-xs text-royal/70">You can cancel or change it online up to {cfg.cancelHours} hours before.{!cfg.autoConfirm && " We will confirm your request shortly."}</p>
        </form>
      )}
    </div>
  );
}
