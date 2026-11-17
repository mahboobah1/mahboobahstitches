import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProductGrid } from "../components/ProductGrid";
import { useCatalogue } from "../context/CatalogueContext";
import { usePageMeta } from "../lib/usePageMeta";
import NotFoundPage from "./NotFoundPage";

export default function CollectionPage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { getCollection, products, status } = useCatalogue();
  const collection = getCollection(slug);
  usePageMeta(collection?.name, collection?.blurb);
  if (status === "loading") return <div className="wrap py-20 text-center" role="status">Loading…</div>;
  if (!collection) return <NotFoundPage />;

  const sub = params.get("sub") ?? "";
  const subs = [...new Set(products.filter((p) => p.collectionSlug === slug).map((p) => p.subcategory).filter(Boolean))];
  const items = products.filter(
    (p) => p.collectionSlug === slug && (!sub || p.subcategory === sub),
  );

  return (
    <div className="wrap py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-royal/70">
        <Link to="/collections" className="link-line">Collections</Link>
      </nav>
      <h1 className="mt-3 text-4xl sm:text-5xl">{collection.name}</h1>
      <p className="mt-3 max-w-xl text-lg text-royal/80">{collection.blurb}</p>

      {subs.length > 1 && (
      <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Subcategories">
        <button
          type="button"
          onClick={() => setParams({}, { replace: true })}
          aria-pressed={!sub}
          className={`btn border ${!sub ? "border-royal bg-royal text-cream" : "border-royal/30"}`}
        >
          All
        </button>
        {subs.length > 1 && subs.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setParams({ sub: s }, { replace: true })}
            aria-pressed={sub === s}
            className={`btn border ${sub === s ? "border-royal bg-royal text-cream" : "border-royal/30"}`}
          >
            {s}
          </button>
        ))}
      </div>
      )}

      <div className="mt-9">
        {items.length > 0 ? (
          <ProductGrid products={items} />
        ) : (
          <div className="border border-dashed border-gold p-8 text-center">
            <p className="font-display text-2xl">No items here yet.</p>
            <p className="mt-2 text-royal/75">New styles will appear here soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
