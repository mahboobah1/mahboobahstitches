import { Link } from "react-router-dom";
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
          <h2 id={id}>{title}</h2>
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
