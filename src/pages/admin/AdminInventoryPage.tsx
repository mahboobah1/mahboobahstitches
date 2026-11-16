import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, errText } from "../../components/admin/kit";
import { StockControl } from "../../components/admin/StockControl";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { usePageMeta } from "../../lib/usePageMeta";

interface Item {
  id: string; sku: string; size: string; colour: string; isActive: number; productName: string; productId: string;
  trackStock: number; onHand: number; reserved: number; allowBackorder: number;
}

export default function AdminInventoryPage() {
  usePageMeta("Inventory");
  const [items, setItems] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => api<{ items: Item[] }>("/api/admin/inventory").then((d) => setItems(d.items)).catch((e) => setError(errText(e)));
  useEffect(() => { void load(); }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (items ?? []).filter((i) => !s || `${i.productName} ${i.sku} ${i.size} ${i.colour}`.toLowerCase().includes(s));
  }, [items, q]);

  return (
    <>
      <h1 className="text-4xl">Inventory</h1>
      <p className="mt-2 max-w-xl text-sm text-royal/75">Every stock change is recorded with who made it and why.</p>
      <div className="mt-6 max-w-sm"><FormField label="Search by product, SKU, size or colour" type="search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!items && !error && <p className="mt-6" role="status">Loading…</p>}
      {items && items.length === 0 && <p className="mt-6">No stock records yet. Add options to a product first.</p>}
      <ul className="mt-6 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {shown.map((i) => {
          const avail = Math.max(0, i.onHand - i.reserved);
          return (
            <li key={i.id} className="py-4">
              <button type="button" className="block w-full text-left" aria-expanded={open === i.id} onClick={() => setOpen(open === i.id ? null : i.id)}>
                <span className="font-display text-xl">{i.productName}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-royal/75">
                  {[i.size, i.colour].filter(Boolean).join(" · ") || "Standard"} · {i.sku}
                  {i.trackStock === 1 ? (<Badge tone={avail === 0 ? "warn" : avail <= 3 ? "warn" : "good"}>{avail === 0 ? "Out of stock" : `${avail} available`}</Badge>) : <Badge>Made to order</Badge>}
                  {i.isActive === 0 && <Badge>Hidden</Badge>}
                </span>
              </button>
              {open === i.id && (
                <>
                  <StockControl variantId={i.id} onHand={i.onHand} reserved={i.reserved} tracked={i.trackStock === 1} onChanged={() => void load()} />
                  <Link to={`/admin/products/${i.productId}`} className="link-line mt-3 inline-block text-sm">Open product</Link>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
