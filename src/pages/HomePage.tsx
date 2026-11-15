import { BespokeIntro } from "../components/home/BespokeIntro";
import { BrandIntro } from "../components/home/BrandIntro";
import { FeaturedCollections } from "../components/home/FeaturedCollections";
import { GiftFeature } from "../components/home/GiftFeature";
import { Hero } from "../components/home/Hero";
import { Newsletter } from "../components/home/Newsletter";
import { Philosophy } from "../components/home/Philosophy";
import { ProductRail } from "../components/home/ProductRail";
import { Testimonials } from "../components/home/Testimonials";
import { demoProducts } from "../data/demo-products";
import { usePageMeta } from "../lib/usePageMeta";

export default function HomePage() {
  usePageMeta(undefined, "Modest fashion, custom styles and thoughtful gifts from Mahboobah Stitches.");
  const fresh = demoProducts.filter((p) => p.isNew).slice(0, 4);
  const best = demoProducts.filter((p) => p.isBestseller).slice(0, 4);
  return (
    <>
      <Hero />
      <BrandIntro />
      <FeaturedCollections />
      <ProductRail id="new-title" title="New arrivals" products={fresh} to="/shop?sort=newest" />
      <ProductRail id="best-title" title="Bestsellers" products={best} to="/shop" />
      <GiftFeature />
      <BespokeIntro />
      <Philosophy />
      <Testimonials />
      <Newsletter />
    </>
  );
}
