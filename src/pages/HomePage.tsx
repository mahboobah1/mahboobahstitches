import { BespokeIntro } from "../components/home/BespokeIntro";
import { BrandIntro } from "../components/home/BrandIntro";
import { FeaturedCollections } from "../components/home/FeaturedCollections";
import { GiftFeature } from "../components/home/GiftFeature";
import { Hero } from "../components/home/Hero";
import { Newsletter } from "../components/home/Newsletter";
import { Philosophy } from "../components/home/Philosophy";
import { ProductRail } from "../components/home/ProductRail";
import { Testimonials } from "../components/home/Testimonials";
import { useCatalogue } from "../context/CatalogueContext";
import { usePageMeta } from "../lib/usePageMeta";

export default function HomePage() {
  usePageMeta(undefined, "Modest fashion, custom styles and thoughtful gifts from Mahboobah Stitches.");
  const { products, status } = useCatalogue();
  const fresh = products.filter((p) => p.isNew).slice(0, 4);
  const best = products.filter((p) => p.isBestseller).slice(0, 4);
  return (
    <>
      <Hero />
      <BrandIntro />
      <FeaturedCollections />
      {status === "ready" && products.length === 0 && (
        <section className="section" aria-label="Coming soon">
          <div className="wrap max-w-2xl border border-dashed border-gold p-8 text-center">
            <h2>Our first pieces are on their way.</h2>
            <p className="mt-3 text-royal/80">New styles will appear here very soon. In the meantime, you can request a custom piece.</p>
          </div>
        </section>
      )}
      {fresh.length > 0 ? (
        <ProductRail id="new-title" title="New arrivals" products={fresh} to="/shop?sort=newest" />
      ) : (
        <ProductRail id="pieces-title" title="Our pieces" products={products.slice(0, 4)} to="/shop" />
      )}
      <ProductRail id="best-title" title="Bestsellers" products={best} to="/shop" />
      <GiftFeature />
      <BespokeIntro />
      <Philosophy />
      <Testimonials />
      <Newsletter />
    </>
  );
}
