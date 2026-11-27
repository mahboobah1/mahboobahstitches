import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckField, Notice, SelectField, errText, type Msg } from "../../components/admin/kit";
import { PictureField } from "../../components/admin/ImagePicker";
import { useVariants, variantLabel, type VariantOpt } from "../../components/admin/useVariants";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { formatMoney, fromMinor, toMinor } from "../../lib/format";
import { usePageMeta } from "../../lib/usePageMeta";

interface Bundle { id: string; slug: string; name: string; description: string | null; kind: "fixed" | "configurable"; imageUrl: string | null; discountPercent: number; isActive: number; items: { variantId: string; qty: number; label: string }[]; slots: { id: string; label: string; variantIds: string[] }[] }
interface Pack { id: string; name: string; description: string | null; priceMinor: number; isActive: number }

export default function AdminGiftsPage() {
  usePageMeta("Gifts");
  const [d, setD] = useState<{ bundles: Bundle[]; packaging: Pack[] } | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const variants = useVariants();
  const [nb, setNb] = useState({ name: "", kind: "fixed" });
  const load = useCallback(() => { api<{ bundles: Bundle[]; packaging: Pack[] }>("/api/admin/gifts").then(setD).catch((e) => setMsg({ ok: false, text: errText(e) })); }, []);
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { setMsg(null); try { await fn(); setMsg({ ok: true, text: ok }); load(); } catch (e) { setMsg({ ok: false, text: errText(e) }); } };
  if (!d) return msg ? <Notice msg={msg} /> : <p role="status">Loading…</p>;
  return (
    <>
      <h1 className="text-4xl">Gifts</h1>
      <p className="mt-2 max-w-xl text-sm text-royal/75">A gift has no stock of its own: buying one buys its products, so their stock is used. The price is the products' current prices (minus the gift saving, if you set one), plus packaging.</p>
      <Notice msg={msg} />
      <ul className="mt-6 space-y-6">{d.bundles.map((b) => <BundleCard key={b.id} b={b} variants={variants} run={run} />)}</ul>
      <div className="mt-8 grid max-w-xl gap-3 border border-gold p-4 sm:grid-cols-3 sm:items-end">
        <FormField label="New gift name" value={nb.name} maxLength={80} onChange={(e) => setNb({ ...nb, name: e.target.value })} />
        <SelectField label="Type" value={nb.kind} onChange={(e) => setNb({ ...nb, kind: e.target.value })}><option value="fixed">Fixed set</option><option value="configurable">Build your own</option></SelectField>
        <button type="button" className="btn-primary" disabled={nb.name.trim().length < 2} onClick={() => void run(async () => { await api("/api/admin/gifts", { method: "POST", body: { ...nb, isActive: false } }); setNb({ name: "", kind: "fixed" }); }, "Gift created (switched off). Add its products, then switch it on.")}>Create</button>
      </div>
      <h2 className="mt-12 !text-2xl">Gift packaging</h2>
      <ul className="mt-3 space-y-3">{d.packaging.map((p) => <PackRow key={p.id} p={p} run={run} />)}</ul>
      <NewPack run={run} />
    </>
  );
}

function BundleCard({ b, variants, run }: { b: Bundle; variants: VariantOpt[]; run: (fn: () => Promise<unknown>, ok: string) => Promise<void> }) {
  const [name, setName] = useState(b.name);
  const [desc, setDesc] = useState(b.description ?? "");
  const [pct, setPct] = useState(String(b.discountPercent));
  const [on, setOn] = useState(b.isActive === 1);
  const [img, setImg] = useState(b.imageUrl ?? "");
  const [items, setItems] = useState(b.items.map((i) => ({ variantId: i.variantId, qty: i.qty })));
  const [slots, setSlots] = useState(b.slots.map((s) => ({ label: s.label, variantIds: s.variantIds })));
  const [pick, setPick] = useState("");
  const byId = useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants]);
  const name_ = (id: string) => (byId.get(id) ? variantLabel(byId.get(id) as VariantOpt) : id);
  const body = { name, slug: undefined, description: desc || undefined, kind: b.kind, imageUrl: img || undefined, discountPercent: Number(pct) || 0, isActive: on };
  return (
    <li className="border border-dashed border-gold p-4">
      <h2 className="!text-2xl">{b.name} <span className="text-sm font-normal text-royal/60">({b.kind === "fixed" ? "fixed set" : "build your own"})</span></h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><FormField label="Name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /><FormField label="Gift saving (% off the products)" type="number" min={0} max={50} value={pct} onChange={(e) => setPct(e.target.value)} /></div>
      <div className="mt-3"><FormField label="Description" value={desc} maxLength={600} onChange={(e) => setDesc(e.target.value)} /></div>
      <div className="mt-3"><PictureField label="Picture" value={img} onChange={setImg} /></div>
      <CheckField label="Show in the Gift Studio" checked={on} onChange={(e) => setOn(e.target.checked)} />
      <button type="button" className="btn-primary" onClick={() => void run(() => api(`/api/admin/gifts/${b.id}`, { method: "PUT", body }), "Gift saved.")}>Save details</button>

      {b.kind === "fixed" ? (
        <div className="mt-6"><h3 className="!text-xl">Products in this set</h3>
          <ul className="mt-2 space-y-2 text-sm">{items.map((i, n) => <li key={i.variantId} className="flex items-center gap-2"><span className="flex-1">{name_(i.variantId)}</span><input aria-label="Quantity" type="number" min={1} max={10} className="field !w-20" value={i.qty} onChange={(e) => setItems(items.map((x, k) => (k === n ? { ...x, qty: Number(e.target.value) || 1 } : x)))} /><button type="button" className="link-line" onClick={() => setItems(items.filter((_, k) => k !== n))}>Remove</button></li>)}</ul>
          <div className="mt-3 flex gap-2"><select aria-label="Add a product" className="field" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Add a product…</option>{variants.filter((v) => !items.some((i) => i.variantId === v.id)).map((v) => <option key={v.id} value={v.id}>{variantLabel(v)}</option>)}</select><button type="button" className="btn-ghost" disabled={!pick} onClick={() => { setItems([...items, { variantId: pick, qty: 1 }]); setPick(""); }}>Add</button></div>
          <button type="button" className="btn-primary mt-3" disabled={items.length === 0} onClick={() => void run(() => api(`/api/admin/gifts/${b.id}/items`, { method: "PUT", body: { items } }), "Products saved.")}>Save products</button>
        </div>
      ) : (
        <div className="mt-6"><h3 className="!text-xl">Steps the customer chooses</h3>
          {slots.map((s, n) => (
            <div key={n} className="mt-3 border border-gold/50 p-3">
              <div className="flex gap-2"><FormField label={`Step ${n + 1} name`} value={s.label} maxLength={60} onChange={(e) => setSlots(slots.map((x, k) => (k === n ? { ...x, label: e.target.value } : x)))} /><button type="button" className="link-line self-end pb-3" onClick={() => setSlots(slots.filter((_, k) => k !== n))}>Remove step</button></div>
              <p className="mt-2 text-xs text-royal/70">Products the customer can pick from:</p>
              <div className="max-h-48 overflow-y-auto">{variants.map((v) => <CheckField key={v.id} label={variantLabel(v)} checked={s.variantIds.includes(v.id)} onChange={(e) => setSlots(slots.map((x, k) => (k === n ? { ...x, variantIds: e.target.checked ? [...x.variantIds, v.id] : x.variantIds.filter((i) => i !== v.id) } : x)))} />)}</div>
            </div>
          ))}
          <div className="mt-3 flex gap-3"><button type="button" className="btn-ghost" onClick={() => setSlots([...slots, { label: "", variantIds: [] }])}>Add a step</button>
            <button type="button" className="btn-primary" disabled={slots.length === 0 || slots.some((s) => s.label.trim().length < 2 || s.variantIds.length === 0)} onClick={() => void run(() => api(`/api/admin/gifts/${b.id}/slots`, { method: "PUT", body: { slots } }), "Steps saved.")}>Save steps</button></div>
        </div>
      )}
    </li>
  );
}

function PackRow({ p, run }: { p: Pack; run: (fn: () => Promise<unknown>, ok: string) => Promise<void> }) {
  const [name, setName] = useState(p.name), [price, setPrice] = useState(fromMinor(p.priceMinor)), [desc, setDesc] = useState(p.description ?? ""), [on, setOn] = useState(p.isActive === 1);
  return (
    <li className="border border-dashed border-gold p-3">
      <div className="grid gap-3 sm:grid-cols-3"><FormField label="Name" value={name} onChange={(e) => setName(e.target.value)} /><FormField label="Price (₦)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /><FormField label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
      <CheckField label="Offer this packaging" checked={on} onChange={(e) => setOn(e.target.checked)} />
      <button type="button" className="btn-ghost" onClick={() => { const m = price.trim() ? toMinor(price) : 0; if (m === null) return; void run(() => api(`/api/admin/gift-packaging/${p.id}`, { method: "PUT", body: { name, priceMinor: m, description: desc || undefined, isActive: on } }), `Saved (${formatMoney(m)}).`); }}>Save</button>
    </li>
  );
}
function NewPack({ run }: { run: (fn: () => Promise<unknown>, ok: string) => Promise<void> }) {
  const [name, setName] = useState(""), [price, setPrice] = useState("");
  return (
    <div className="mt-4 grid max-w-xl gap-3 border border-gold p-4 sm:grid-cols-3 sm:items-end">
      <FormField label="New packaging" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /><FormField label="Price (₦)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      <button type="button" className="btn-primary" disabled={name.trim().length < 2} onClick={() => { const m = price.trim() ? toMinor(price) : 0; if (m === null) return; void run(async () => { await api("/api/admin/gift-packaging", { method: "POST", body: { name, priceMinor: m } }); setName(""); setPrice(""); }, "Packaging added."); }}>Add</button>
    </div>
  );
}
