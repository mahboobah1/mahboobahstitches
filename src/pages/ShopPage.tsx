import { Link, useSearchParams } from "react-router-dom";
import { ProductGrid } from "../components/ProductGrid";
import { useCatalogue } from "../context/CatalogueContext";
import type { FulfilmentType, Product } from "../data/types";
import { fulfilmentLabel } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";

const sorts = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name A to Z" },
];

export function filterProducts(
  list: Product[],
  opts: { q: string; collection: string; type: string; sort: string },
): Product[] {
  const q = opts.q.trim().toLowerCase();
  let out = list.filter((p) => {
    if (opts.collection && p.collectionSlug !== opts.collection) return false;
    if (opts.type && p.type !== opts.type) return false;
    if (q && !`${p.name} ${p.subcategory} ${p.description}`.toLowerCase().includes(q)) return false;
    return true;
  });
  if (opts.sort === "newest") out = [...out].sort((a, b) => Number(b.isNew) - Number(a.isNew));
  if (opts.sort === "name") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export default function ShopPage() {
  usePageMeta("Shop", "Browse all modest fashion, prayer wear and gifts.");
  const { visibleCollections: collections, products, status } = useCatalogue();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const collection = params.get("collection") ?? "";
  const type = params.get("type") ?? "";
  const sort = params.get("sort") ?? "featured";

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const results = filterProducts(products, { q, collection, type, sort });
  const hasFilters = q || collection || type;

  return (
    <div className="wrap py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Shop</h1>
      {q && <p className="mt-2 text-royal/75">Results for “{q}”</p>}

      <form className="mt-8 grid gap-3 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()} aria-label="Filter and sort products">
        <div>
          <label htmlFor="f-collection" className="mb-1 block text-sm">Collection</label>
          <select id="f-collection" className="field" value={collection} onChange={(e) => set("collection", e.target.value)}>
            <option value="">All collections</option>
            {collections.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-type" className="mb-1 block text-sm">Availability type</label>
          <select id="f-type" className="field" value={type} onChange={(e) => set("type", e.target.value)}>
            <option value="">All types</option>
            {(Object.keys(fulfilmentLabel) as FulfilmentType[]).map((t) => (
              <option key={t} value={t}>{fulfilmentLabel[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-sort" className="mb-1 block text-sm">Sort by</label>
          <select id="f-sort" className="field" value={sort} onChange={(e) => set("sort", e.target.value)}>
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </form>

      <p className="mt-6 text-sm text-royal/75" role="status">
        {status === "loading" ? "Loading…" : `${results.length} ${results.length === 1 ? "item" : "items"}`}
      </p>

      <div className="mt-6">
        {status === "error" ? (
          <p role="alert" className="text-[#9b2c2c]">The shop could not be loaded. Please refresh the page.</p>
        ) : results.length > 0 ? (
          <ProductGrid products={results} />
        ) : status === "loading" ? null : (
          <div className="border border-dashed border-gold p-8 text-center">
            <p className="font-display text-2xl">{products.length === 0 ? "New styles are coming soon." : "Nothing matches that search."}</p>
            <p className="mt-2 text-royal/75">{products.length === 0 ? "Please check back shortly." : "Try a different word or clear the filters."}</p>
            {hasFilters && (
              <Link to="/shop" className="btn-primary mt-5">Clear filters</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
