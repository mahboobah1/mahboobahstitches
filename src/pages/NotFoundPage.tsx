import { Link } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";

export default function NotFoundPage() {
  usePageMeta("Page not found");
  return (
    <div className="wrap py-24 text-center">
      <h1 className="text-4xl sm:text-5xl">We could not find that page.</h1>
      <p className="mt-4 text-royal/80">The link may be old or mistyped.</p>
      <Link to="/shop" className="btn-primary mt-7">Go to the shop</Link>
    </div>
  );
}
