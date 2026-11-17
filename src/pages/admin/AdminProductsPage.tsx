import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, errText } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { fulfilmentLabel } from "../../lib/format";
import type { FulfilmentType } from "../../data/types";
import { usePageMeta } from "../../lib/usePageMeta";

interface Row {
  id: string;
  name: string;
  status: "draft" | "active" | "archived";
  type: FulfilmentType;
  collectionName: string;
  variantCount: number;
  imageCount: number;
  minPrice: number | null;
}

export default function AdminProductsPage() {
  usePageMeta("Products");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => {
      api<{ products: Row[] }>(`/api/admin/products?q=${encodeURIComponent(q)}`)
        .then((d) => setRows(d.products))
        .catch((e) => setError(errText(e)));
    }, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl">Products</h1>
        <Link to="/admin/products/new" className="btn-primary">Add a product</Link>
      </div>
      <div className="mt-6 max-w-sm"><FormField label="Search products" type="search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!rows && !error && <p className="mt-6" role="status">Loading…</p>}
      {rows && rows.length === 0 && <p className="mt-6">No products yet. Tap “Add a product” to create your first one.</p>}
      <ul className="mt-6 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {rows?.map((r) => (
          <li key={r.id}>
            <Link to={`/admin/products/${r.id}`} className="block py-4">
              <span className="font-display text-xl">{r.name}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-royal/75">
                <Badge tone={r.status === "active" ? "good" : r.status === "draft" ? "warn" : "plain"}>{r.status === "active" ? "Live" : r.status === "draft" ? "Draft" : "Archived"}</Badge>
                {r.minPrice === 0 && <Badge tone="warn">Needs a price</Badge>}
                {r.collectionName} · {fulfilmentLabel[r.type]} · {r.variantCount} {r.variantCount === 1 ? "option" : "options"} · {r.imageCount} {r.imageCount === 1 ? "photo" : "photos"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
