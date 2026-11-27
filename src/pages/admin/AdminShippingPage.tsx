import { useCallback, useEffect, useState } from "react";
import { CheckField, Notice, errText, type Msg } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { formatMoney, fromMinor, toMinor } from "../../lib/format";
import { usePageMeta } from "../../lib/usePageMeta";

interface Rate { id: string; name: string; priceMinor: number; minDays: number | null; maxDays: number | null; freeOverMinor: number | null; isActive: number }
interface Zone { id: string; name: string; countries: string[]; states: string[] | null; isActive: number; rates: Rate[] }
type Run = (fn: () => Promise<unknown>, ok: string) => Promise<void>;

export default function AdminShippingPage() {
  usePageMeta("Shipping");
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [nz, setNz] = useState({ name: "", countries: "NG", states: "" });
  const load = useCallback(() => { api<{ zones: Zone[] }>("/api/admin/shipping").then((d) => setZones(d.zones)).catch((e) => setMsg({ ok: false, text: errText(e) })); }, []);
  useEffect(load, [load]);
  const run: Run = async (fn, ok) => { setMsg(null); try { await fn(); setMsg({ ok: true, text: ok }); load(); } catch (e) { setMsg({ ok: false, text: errText(e) }); } };
  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  if (!zones) return msg ? <Notice msg={msg} /> : <p role="status">Loading…</p>;
  return (
    <>
      <h1 className="text-4xl">Shipping</h1>
      <p className="mt-2 max-w-xl text-sm text-royal/75">Create delivery zones (a country, or only some states), then the delivery options and prices for each. A zone that lists states beats a whole-country zone. Until you add a zone, checkout uses one flat fee for Nigeria only (Settings).</p>
      <Notice msg={msg} />
      <ul className="mt-6 space-y-6">{zones.map((z) => <ZoneCard key={z.id} z={z} run={run} list={list} />)}</ul>
      <div className="mt-8 max-w-xl space-y-3 border border-gold p-4">
        <h2 className="!text-2xl">Add a zone</h2>
        <FormField label="Zone name" value={nz.name} maxLength={60} onChange={(e) => setNz({ ...nz, name: e.target.value })} />
        <FormField label="Countries (two-letter codes, comma separated)" value={nz.countries} onChange={(e) => setNz({ ...nz, countries: e.target.value })} hint="For example: NG, or GH, GB" />
        <FormField label="Only these states (optional, comma separated)" value={nz.states} onChange={(e) => setNz({ ...nz, states: e.target.value })} hint="For example: Lagos, Ogun. Leave empty for the whole country." />
        <button type="button" className="btn-primary" disabled={nz.name.trim().length < 2} onClick={() => void run(async () => { await api("/api/admin/shipping/zones", { method: "POST", body: { name: nz.name, countries: list(nz.countries), states: list(nz.states) } }); setNz({ name: "", countries: "NG", states: "" }); }, "Zone added. Now add its delivery options.")}>Add zone</button>
      </div>
    </>
  );
}

function ZoneCard({ z, run, list }: { z: Zone; run: Run; list: (s: string) => string[] }) {
  const [name, setName] = useState(z.name), [co, setCo] = useState(z.countries.join(", ")), [st, setSt] = useState((z.states ?? []).join(", ")), [on, setOn] = useState(z.isActive === 1);
  return (
    <li className="border border-dashed border-gold p-4">
      <div className="grid gap-3 sm:grid-cols-3"><FormField label="Zone name" value={name} onChange={(e) => setName(e.target.value)} /><FormField label="Countries" value={co} onChange={(e) => setCo(e.target.value)} /><FormField label="Only these states" value={st} onChange={(e) => setSt(e.target.value)} /></div>
      <CheckField label="Zone is active" checked={on} onChange={(e) => setOn(e.target.checked)} />
      <div className="flex gap-3"><button type="button" className="btn-primary" onClick={() => void run(() => api(`/api/admin/shipping/zones/${z.id}`, { method: "PUT", body: { name, countries: list(co), states: list(st), isActive: on } }), "Zone saved.")}>Save zone</button>
        <button type="button" className="btn-ghost" onClick={() => { if (window.confirm(`Delete the zone "${z.name}" and its options?`)) void run(() => api(`/api/admin/shipping/zones/${z.id}`, { method: "DELETE" }), "Zone deleted."); }}>Delete zone</button></div>
      <h3 className="mt-5 !text-xl">Delivery options</h3>
      <ul className="mt-2 space-y-3">{z.rates.map((r) => <RateRow key={r.id} r={r} run={run} />)}{z.rates.length === 0 && <li className="text-sm text-royal/70">No options yet, so customers cannot choose delivery to this zone.</li>}</ul>
      <NewRate zoneId={z.id} run={run} />
    </li>
  );
}
function RateRow({ r, run }: { r: Rate; run: Run }) {
  const [f, setF] = useState({ name: r.name, price: fromMinor(r.priceMinor), min: r.minDays?.toString() ?? "", max: r.maxDays?.toString() ?? "", free: r.freeOverMinor ? fromMinor(r.freeOverMinor) : "", on: r.isActive === 1 });
  const body = () => { const p = f.price.trim() ? toMinor(f.price) : 0; const fr = f.free.trim() ? toMinor(f.free) : null; if (p === null || (f.free.trim() && fr === null)) return null; return { name: f.name, priceMinor: p, minDays: f.min === "" ? null : Number(f.min), maxDays: f.max === "" ? null : Number(f.max), freeOverMinor: fr, isActive: f.on }; };
  return (
    <li className="border border-gold/50 p-3">
      <div className="grid gap-3 sm:grid-cols-5"><FormField label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><FormField label="Price (₦)" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /><FormField label="Min days" type="number" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /><FormField label="Max days" type="number" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /><FormField label="Free over (₦)" inputMode="decimal" value={f.free} onChange={(e) => setF({ ...f, free: e.target.value })} /></div>
      <CheckField label={`Offer this option (${formatMoney(r.priceMinor)})`} checked={f.on} onChange={(e) => setF({ ...f, on: e.target.checked })} />
      <div className="flex gap-3"><button type="button" className="btn-ghost" onClick={() => { const b = body(); if (b) void run(() => api(`/api/admin/shipping/rates/${r.id}`, { method: "PUT", body: b }), "Option saved."); }}>Save</button><button type="button" className="link-line" onClick={() => { if (window.confirm("Delete this option?")) void run(() => api(`/api/admin/shipping/rates/${r.id}`, { method: "DELETE" }), "Deleted."); }}>Delete</button></div>
    </li>
  );
}
function NewRate({ zoneId, run }: { zoneId: string; run: Run }) {
  const [f, setF] = useState({ name: "", price: "", min: "", max: "" });
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-5 sm:items-end">
      <FormField label="New option" value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} /><FormField label="Price (₦)" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /><FormField label="Min days" type="number" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /><FormField label="Max days" type="number" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} />
      <button type="button" className="btn-primary" disabled={f.name.trim().length < 2} onClick={() => { const p = f.price.trim() ? toMinor(f.price) : 0; if (p === null) return; void run(async () => { await api(`/api/admin/shipping/zones/${zoneId}/rates`, { method: "POST", body: { name: f.name, priceMinor: p, minDays: f.min === "" ? null : Number(f.min), maxDays: f.max === "" ? null : Number(f.max) } }); setF({ name: "", price: "", min: "", max: "" }); }, "Option added."); }}>Add option</button>
    </div>
  );
}
