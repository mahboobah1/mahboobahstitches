import { Link } from "react-router-dom";
import { site } from "../../config/site";
import { PlaceholderImage } from "../PlaceholderImage";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-powder" aria-labelledby="hero-title">
      {/* The brand thread draws itself once on load, then stays still. */}
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <path
          className="thread-draw"
          pathLength={1400}
          d="M-20 430 C 140 330, 260 470, 400 380 S 640 250, 820 330"
          fill="none"
          stroke="#B69A65"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>

      <div className="wrap relative grid items-center gap-10 py-12 sm:py-20 md:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h1 id="hero-title" className="max-w-xl">
            {site.tagline}
          </h1>
          <p className="mt-5 max-w-md text-lg text-royal/85">
            Modest fashion, custom styles and thoughtful gifts, made to be worn and treasured.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/collections" className="btn-primary">
              Shop the collections
            </Link>
            <Link to="/bespoke" className="btn-ghost">
              Start a bespoke order
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm md:max-w-none">
          <div className="stitch-frame arch">
            {site.heroImage ? (
              <img
                src={site.heroImage}
                alt="A Mahboobah Stitches outfit on a mannequin"
                width={1200}
                height={1500}
                loading="eager"
                decoding="async"
                className="arch aspect-[4/5] w-full bg-cream object-cover object-bottom"
              />
            ) : (
              <PlaceholderImage label="Hero photograph" tone="cream" className="arch aspect-[4/5] w-full" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
