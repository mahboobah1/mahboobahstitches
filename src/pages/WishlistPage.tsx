import { Link } from "react-router-dom";
import { ProductGrid } from "../components/ProductGrid";
import { demoProducts } from "../data/demo-products";
import { useStore } from "../context/StoreContext";
import { usePageMeta } from "../lib/usePageMeta";

export default function WishlistPage() {
  usePageMeta("Wishlist");
  const { wishlist } = useStore();
  const items = demoProducts.filter((p) => wishlist.includes(p.slug));
  return (
    <div className="wrap py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Wishlist</h1>
      <p className="mt-2 text-sm text-royal/70">Saved on this device. Syncing to your account arrives with sign-in.</p>
      <div className="mt-8">
        {items.length ? (
          <ProductGrid products={items} />
        ) : (
          <div className="border border-dashed border-gold p-8 text-center">
            <p className="font-display text-2xl">Nothing saved yet.</p>
            <p className="mt-2 text-royal/75">Tap the heart on any product to keep it here.</p>
            <Link to="/shop" className="btn-primary mt-5">Browse the shop</Link>
          </div>
        )}
      </div>
    </div>
  );
}
