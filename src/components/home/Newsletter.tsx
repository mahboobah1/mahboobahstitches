import { useState, type FormEvent } from "react";
import { hasWhatsapp } from "../../config/site";
import { api } from "../../lib/api";
import { generalEnquiryLink } from "../../lib/whatsapp";
import { FormError, FormField } from "../FormField";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await api("/api/newsletter", { method: "POST", body: { email, source: "homepage" } }); setDone(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not sign you up."); } finally { setBusy(false); }
  };
  return (
    <section className="section" aria-labelledby="news-title">
      <div className="wrap max-w-2xl text-center">
        <h2 id="news-title">Hear about new styles first.</h2>
        {done ? <p className="mt-4" role="status">Thank you! You are on the list.</p> : (
          <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end" noValidate>
            <div className="flex-1 text-left"><FormField label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <button type="submit" className="btn-primary" disabled={busy || email.trim().length < 5}>{busy ? "Joining…" : "Join"}</button>
          </form>
        )}
        {!done && <div className="mt-3"><FormError message={error} /></div>}
        {hasWhatsapp() && <p className="mt-4 text-sm"><a className="link-line" href={generalEnquiryLink("please add me to your updates about new styles.")} target="_blank" rel="noopener noreferrer">Prefer WhatsApp?</a></p>}
      </div>
    </section>
  );
}
