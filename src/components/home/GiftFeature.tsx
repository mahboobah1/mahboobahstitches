import { Link } from "react-router-dom";
import { demoProducts } from "../../data/demo-products";
import { ProductGrid } from "../ProductGrid";

export function GiftFeature() {
  const gifts = demoProducts.filter((p) => p.collectionSlug === "combo-and-gift").slice(0, 2);
  return (
    <section className="section bg-royal text-cream" aria-labelledby="gift-title">
      <div className="wrap grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 id="gift-title" className="!text-cream">
            Gifts that feel thought through.
          </h2>
          <p className="mt-4 max-w-md text-cream/85">
            Pair a prayer dress with a prayer mat, or build a set for a little one. Add packaging and a personal message.
          </p>
          <Link to="/gift-studio" className="btn-gold mt-7">
            Open the Gift Studio
          </Link>
        </div>
        {/* Cards sit on a cream panel so text stays readable on the blue band. */}
        <div className="rounded-sm bg-cream p-5 text-royal">
          <ProductGrid products={gifts} />
        </div>
      </div>
    </section>
  );
}
