import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FormError, FormField } from "../components/FormField";
import { PlaceholderImage } from "../components/PlaceholderImage";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";
import { generalEnquiryLink } from "../lib/whatsapp";

interface Opt { variantId: string; name: string; size: string; colour: string; priceMinor: number; imageUrl: string | null; qty: number }
interface Bundle { id: string; slug: string; name: string; description: string | null; kind: "fixed" | "configurable"; imageUrl: string | null; discountPercent: number; items?: Opt[]; priceMinor?: number; savingMinor?: number; slots?: { id: string; label: string; options: Opt[] }[]; fromMinor?: number; available: boolean }
interface Pack { id: string; name: string; description: string | null; priceMinor: number }
const label = (o: Opt) => `${o.name}${[o.size, o.colour].filter(Boolean).length ? ` (${[o.size, o.colour].filter(Boolean).join(", ")})` : ""}`;

export default function GiftStudioPage() {
  usePageMeta("Gift Studio", "Prayer sets, gift bundles and build-your-own gifts with packaging and a personal message.");
  const { addGift } = useStore();
  const [data, setData] = useState<{ bundles: Bundle[]; packaging: Pack[] } | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { api<{ bundles: Bundle[]; packaging: Pack[] }>("/api/gifts").then(setData).catch((e) => setError(e instanceof Error ? e.message : "Could not load gifts.")); }, []);

  if (!data) return <div className="wrap py-20 text-center">{error ? <FormError message={error} /> : <p role="status">Loading…</p>}</div>;
  return (
    <div className="wrap py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Gift Studio</h1>
      <p className="mt-3 max-w-xl text-royal/80">Choose a ready-made gift or build your own, add packaging and a personal message.</p>
      {data.bundles.length === 0 && (
        <div className="mt-10 border border-dashed border-gold p-8 text-center">
          <p className="font-display text-2xl">Our gift sets are being prepared.</p>
          <a href={generalEnquiryLink("I would like help choosing a gift.")} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5">Ask us on WhatsApp</a>
        </div>
      )}
      <ul className="mt-10 grid gap-10 md:grid-cols-2">
        {data.bundles.map((b) => (
          <li key={b.id} className="border border-gold/60 p-4">
            {b.imageUrl ? <img src={b.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full bg-powder object-cover object-top" /> : <PlaceholderImage label={b.name} className="aspect-[4/3] w-full" showLabel={false} />}
            <h2 className="mt-3 !text-2xl">{b.name}</h2>
            {b.description && <p className="mt-1 text-sm text-royal/80">{b.description}</p>}
            <p className="mt-2 font-medium">
              {b.kind === "fixed" ? (<>{formatMoney(b.priceMinor ?? 0)}{(b.savingMinor ?? 0) > 0 && <span className="ml-2 text-sm font-normal text-royal/70">you save {formatMoney(b.savingMinor ?? 0)}</span>}</>) : b.available ? `From ${formatMoney(b.fromMinor ?? 0)}` : ""}
            </p>
            {!b.available ? <p className="mt-3 text-sm text-royal/70">Currently unavailable. <a className="link-line" href={generalEnquiryLink(`I am interested in the ${b.name} gift.`)} target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a></p> : (
              <button type="button" className="btn-primary mt-4" aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)}>{open === b.id ? "Close" : "Choose this gift"}</button>
            )}
            {open === b.id && <Builder bundle={b} packaging={data.packaging} onAdd={(g) => { addGift(g); setOpen(null); }} />}
          </li>
        ))}
      </ul>
      <p className="mt-10 text-sm text-royal/70">Your gifts are in your <Link className="link-line" to="/cart">cart</Link>. Final prices are confirmed at checkout.</p>
    </div>
  );
}

function Builder({ bundle, packaging, onAdd }: { bundle: Bundle; packaging: Pack[]; onAdd: (g: Parameters<ReturnType<typeof useStore>["addGift"]>[0]) => void }) {
  const [sel, setSel] = useState<Record<string, string>>({});
  const [pack, setPack] = useState("");
  const [message, setMessage] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const chosenPack = packaging.find((p) => p.id === pack) ?? null;
  const picked = useMemo(() => (bundle.kind === "fixed" ? bundle.items ?? [] : (bundle.slots ?? []).map((s) => s.options.find((o) => o.variantId === sel[s.id])).filter((o): o is Opt => !!o)), [bundle, sel]);
  const base = picked.reduce((s, o) => s + o.priceMinor * o.qty, 0);
  const total = base - Math.floor((base * bundle.discountPercent) / 100) + (chosenPack?.priceMinor ?? 0);

  const add = () => {
    if (bundle.kind === "configurable" && (bundle.slots ?? []).some((s) => !sel[s.id])) { setError("Please choose an option for each step."); return; }
    onAdd({ bundleId: bundle.id, bundleName: bundle.name, kind: bundle.kind, selections: sel, packagingId: pack || null, packagingName: chosenPack?.name ?? null, message, recipientName: to, contents: picked.map((o) => `${o.qty > 1 ? `${o.qty} × ` : ""}${label(o)}`), estimateMinor: total });
  };
  return (
    <div className="mt-5 space-y-5 border-t border-dashed border-gold pt-5">
      {bundle.kind === "fixed" ? (
        <div><p className="text-sm font-medium">Includes</p><ul className="mt-1 list-disc pl-5 text-sm">{bundle.items?.map((o) => <li key={o.variantId}>{o.qty > 1 ? `${o.qty} × ` : ""}{label(o)}</li>)}</ul></div>
      ) : bundle.slots?.map((s, i) => (
        <div key={s.id}>
          <label htmlFor={`slot-${s.id}`} className="mb-1 block text-sm font-medium">{i + 1}. {s.label}</label>
          <select id={`slot-${s.id}`} className="field" value={sel[s.id] ?? ""} onChange={(e) => { setSel({ ...sel, [s.id]: e.target.value }); setError(""); }}>
            <option value="">Choose</option>
            {s.options.map((o) => <option key={o.variantId} value={o.variantId}>{label(o)} · {formatMoney(o.priceMinor)}</option>)}
          </select>
        </div>
      ))}
      {packaging.length > 0 && (
        <fieldset><legend className="mb-1 text-sm font-medium">Packaging</legend>
          <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="radio" name={`pk-${bundle.id}`} checked={pack === ""} onChange={() => setPack("")} /> No special packaging</label>
          {packaging.map((p) => <label key={p.id} className="flex min-h-[44px] items-center gap-3 text-sm"><input type="radio" name={`pk-${bundle.id}`} checked={pack === p.id} onChange={() => setPack(p.id)} /> {p.name} · {p.priceMinor ? formatMoney(p.priceMinor) : "free"}{p.description && <span className="text-royal/60"> · {p.description}</span>}</label>)}
        </fieldset>
      )}
      <FormField label="Who is it for? (optional)" value={to} maxLength={80} onChange={(e) => setTo(e.target.value)} />
      <FormField label="Personal message (optional)" value={message} maxLength={300} onChange={(e) => setMessage(e.target.value)} hint="Printed on a card with the gift." />
      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-4"><button type="button" className="btn-primary" onClick={add}>Add gift to cart</button><span className="text-sm">{picked.length > 0 && `About ${formatMoney(total)}`}</span></div>
    </div>
  );
}
