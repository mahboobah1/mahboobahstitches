import { Link } from "react-router-dom";

export function BrandIntro() {
  return (
    <section className="section" aria-labelledby="intro-title">
      <div className="wrap grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <h2 id="intro-title">Dressed with care, stitch by stitch.</h2>
        <div className="space-y-4 text-lg text-royal/85">
          <p>
            Mahboobah Stitches brings together modest fashion, custom designs and gifts. Choose something ready to wear,
            order a style made for you, or put together a gift that feels personal.
          </p>
          <p>
            <Link to="/about" className="link-line">
              Read our story
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
