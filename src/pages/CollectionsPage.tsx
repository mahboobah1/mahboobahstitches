import { Link } from "react-router-dom";
import { PlaceholderImage } from "../components/PlaceholderImage";
import { useCatalogue } from "../context/CatalogueContext";
import { usePageMeta } from "../lib/usePageMeta";

export default function CollectionsPage() {
  usePageMeta("Collections", "Jilbabs, abayas, prayer wear, kiddies hijabs, patterned dresses and gift sets.");
  const { visibleCollections: collections, products } = useCatalogue();
  return (
    <div className="wrap py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Collections</h1>
      <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c, i) => {
          const cover = c.imageUrl ? { url: c.imageUrl, alt: c.name } : products.find((p) => p.collectionSlug === c.slug && p.images[0])?.images[0];
          return (
            <li key={c.slug}>
              <Link to={`/collections/${c.slug}`} className="block">
                {cover ? (
                  <img src={cover.url} alt={cover.alt} loading="lazy" className="aspect-[4/3] w-full bg-powder object-cover object-top" />
                ) : (
                  <PlaceholderImage label={c.name} tone={i % 3 === 2 ? "royal" : "powder"} className="aspect-[4/3] w-full" showLabel={false} />
                )}
                <h2 className="mt-4 text-2xl">{c.name}</h2>
                <p className="mt-1 text-royal/80">{c.blurb}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
