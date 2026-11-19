import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge, CheckField, Notice, SelectField, errText, type Msg } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { formatMoney, toMinor } from "../../lib/format";
import { usePageMeta } from "../../lib/usePageMeta";

interface Promo { id: string; code: string; kind: "percent" | "fixed"; value: number; minSubtotalMinor: number; startsAt: number | null; endsAt: number | null; maxRedemptions: number | null; redeemedCount: number; isActive: number }

export default function AdminPromotionsPage() {
  usePageMeta("Discount codes");
  const [list, setList] = useState<Promo[] | null>(null);
  const [f, setF] = useState({ code: "", kind: "percent", value: "", min: "", max: "", ends: "", active: true });
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api<{ promotions: Promo[] }>("/api/admin/promotions").then((d) => setList(d.promotions)).catch((e) => setMsg({ ok: false, text: errText(e) })); }, []);
  useEffect(load, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const amount = f.kind === "percent" ? Number(f.value) : toMinor(f.value);
    if (amount === null || !Number.isFinite(amount) || amount <= 0) { setMsg({ ok: false, text: "Enter the discount amount." }); return; }
    const min = f.min.trim() ? toMinor(f.min) : 0;
    if (min === null) { setMsg({ ok: false, text: "Enter the minimum order as a number." }); return; }
    setBusy(true);
    try {
      await api("/api/admin/promotions", { method: "POST", body: {
        code: f.code, kind: f.kind, value: amount, minSubtotalMinor: min, maxRedemptions: f.max.trim() ? Number(f.max) : null,
        endsAt: f.ends ? Math.floor(new Date(`${f.ends}T23:59:59`).getTime() / 1000) : null, isActive: f.active,
      } });
      setF({ code: "", kind: "percent", value: "", min: "", max: "", ends: "", active: true });
      setMsg({ ok: true, text: "Code created." });
      load();
    } catch (err) { setMsg({ ok: false, text: errText(err) }); } finally { setBusy(false); }
  };
  const toggle = async (p: Promo) => {
    try {
      await api(`/api/admin/promotions/${p.id}`, { method: "PUT", body: { code: p.code, kind: p.kind, value: p.value, minSubtotalMinor: p.minSubtotalMinor, startsAt: p.startsAt, endsAt: p.endsAt, maxRedemptions: p.maxRedemptions, isActive: p.isActive !== 1 } });
      load();
    } catch (err) { setMsg({ ok: false, text: errText(err) }); }
  };

  return (
    <>
      <h1 className="text-4xl">Discount codes</h1>
      <ul className="mt-6 space-y-3">
        {list?.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border border-dashed border-gold p-4">
            <div>
              <p className="font-medium">{p.code} <Badge tone={p.isActive ? "good" : "plain"}>{p.isActive ? "On" : "Off"}</Badge></p>
              <p className="text-sm text-royal/75">{p.kind === "percent" ? `${p.value}% off` : `${formatMoney(p.value)} off`}{p.minSubtotalMinor > 0 && ` · min order ${formatMoney(p.minSubtotalMinor)}`} · used {p.redeemedCount}{p.maxRedemptions ? ` of ${p.maxRedemptions}` : ""}{p.endsAt ? ` · ends ${new Date(p.endsAt * 1000).toLocaleDateString()}` : ""}</p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => toggle(p)}>{p.isActive ? "Switch off" : "Switch on"}</button>
          </li>
        ))}
        {list && list.length === 0 && <li>No codes yet.</li>}
      </ul>
      <form onSubmit={create} className="mt-10 max-w-xl space-y-4 border border-gold p-4" noValidate>
        <h2 className="!text-2xl">New code</h2>
        <FormField label="Code" value={f.code} maxLength={30} onChange={(e) => setF({ ...f, code: e.target.value })} hint="Letters and numbers, e.g. EID10. Customers type it at checkout." />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Type" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="percent">Percent off</option><option value="fixed">Naira off</option></SelectField>
          <FormField label={f.kind === "percent" ? "Percent (1 to 100)" : "Amount (₦)"} inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
          <FormField label="Minimum order (₦, optional)" inputMode="decimal" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} />
          <FormField label="Maximum uses (optional)" type="number" min={1} value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} />
          <FormField label="Ends on (optional)" type="date" value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} />
        </div>
        <CheckField label="Switched on" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
        <div className="flex items-center gap-4"><button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Create code"}</button><Notice msg={msg} /></div>
      </form>
    </>
  );
}
