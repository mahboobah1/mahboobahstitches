import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Notice, errText, type Msg } from "../components/admin/kit";
import { FormField } from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { usePageMeta } from "../lib/usePageMeta";

interface Addr { id: string; label: string | null; recipientName: string; phone: string | null; line1: string; line2: string | null; city: string; state: string; postalCode: string | null; isDefault: number }
const blank = { label: "", recipientName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" };

export default function AccountAddressesPage() {
  usePageMeta("My addresses");
  const { user, status } = useAuth();
  const [list, setList] = useState<Addr[] | null>(null);
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api<{ addresses: Addr[] }>("/api/account/addresses").then((d) => setList(d.addresses)).catch((e) => setMsg({ ok: false, text: errText(e) })); }, []);
  useEffect(() => { if (user) load(); }, [user, load]);
  if (status === "loading") return <div className="wrap py-20 text-center" role="status">Loading…</div>;
  if (!user) return <Navigate to="/account/login?next=/account/addresses" replace />;
  const set = (k: keyof typeof blank, v: string) => setF((p) => ({ ...p, [k]: v }));

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/account/addresses", { method: "POST", body: f });
      setF(blank);
      setMsg({ ok: true, text: "Address saved." });
      load();
    } catch (err) { setMsg({ ok: false, text: errText(err) }); } finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this address?")) return;
    try { await api(`/api/account/addresses/${id}`, { method: "DELETE" }); load(); } catch (err) { setMsg({ ok: false, text: errText(err) }); }
  };

  return (
    <div className="wrap max-w-2xl py-12 sm:py-16">
      <Link to="/account" className="link-line text-sm">← My account</Link>
      <h1 className="mt-2 text-4xl">My addresses</h1>
      <p className="mt-2 text-sm text-royal/75">Your first address is filled in for you at checkout. Delivery is within Nigeria.</p>
      <ul className="mt-6 space-y-3">
        {list?.map((a) => (
          <li key={a.id} className="border border-dashed border-gold p-4 text-sm">
            <p className="font-medium">{a.label || "Address"} {a.isDefault === 1 && <span className="font-normal text-royal/70">(default)</span>}</p>
            <p>{a.recipientName}, {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.postalCode}</p>
            <button type="button" className="link-line mt-2" onClick={() => remove(a.id)}>Delete</button>
          </li>
        ))}
        {list && list.length === 0 && <li>No saved addresses yet.</li>}
      </ul>
      <form onSubmit={add} className="mt-8 space-y-4 border border-gold p-4" noValidate>
        <h2 className="!text-2xl">Add an address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Label (Home, Work)" value={f.label} onChange={(e) => set("label", e.target.value)} />
          <FormField label="Recipient name" value={f.recipientName} onChange={(e) => set("recipientName", e.target.value)} required />
          <FormField label="Phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} required />
          <FormField label="Street address" value={f.line1} onChange={(e) => set("line1", e.target.value)} required />
          <FormField label="Landmark (optional)" value={f.line2} onChange={(e) => set("line2", e.target.value)} />
          <FormField label="City or town" value={f.city} onChange={(e) => set("city", e.target.value)} required />
          <FormField label="State" value={f.state} onChange={(e) => set("state", e.target.value)} required />
          <FormField label="Postal code (optional)" value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
        </div>
        <div className="flex items-center gap-4"><button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save address"}</button><Notice msg={msg} /></div>
      </form>
    </div>
  );
}
