import { Link } from "react-router-dom";
import { site } from "../../config/site";
import type { Product } from "../../data/types";
import { ProductGrid } from "../ProductGrid";

interface Props {
  id: string;
  title: string;
  products: Product[];
  to: string;
}

export function ProductRail({ id, title, products, to }: Props) {
  if (products.length === 0) return null;
  return (
    <section className="section" aria-labelledby={id}>
      <div className="wrap">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id={id}>{title}</h2>
            {site.demoMode && <p className="mt-2 text-sm text-royal/70">Sample items for preview. Not real stock.</p>}
          </div>
          <Link to={to} className="link-line shrink-0 text-sm">
            See more
          </Link>
        </div>
        <div className="mt-8">
          <ProductGrid products={products} />
        </div>
      </div>
    </section>
  );
}
