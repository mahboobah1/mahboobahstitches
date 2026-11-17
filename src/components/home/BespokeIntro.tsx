import { Link } from "react-router-dom";
import { site } from "../../config/site";

const steps = [
  "Tell us the outfit, fabric, colour and your measurements.",
  "We review your request and send a quotation.",
  "You approve it, and we begin production.",
];

export function BespokeIntro() {
  return (
    <section className="section" aria-labelledby="bespoke-title">
      <div className="wrap grid gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <h2 id="bespoke-title">Made for you, to your measure.</h2>
          <p className="mt-4 max-w-md text-lg text-royal/85">
            Have a design in mind? Send us your idea and we will work through it with you.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/bespoke" className="btn-primary">
              Request a custom style
            </Link>
            <Link to="/bookings" className="btn-ghost">
              Book a fitting
            </Link>
          </div>
        </div>
        <div>
        {site.bespokeImage && (
          <img src={site.bespokeImage} alt="A custom-tailored dress by Mahboobah Stitches" width={1200} height={1500} loading="lazy" decoding="async"
            className="mb-8 aspect-[4/3] w-full bg-cream-deep object-cover object-[50%_20%]" />
        )}
        {/* A real sequence, so numbering is meaningful here. */}
        <ol className="space-y-0 border-l border-dashed border-gold pl-6">
          {steps.map((s, i) => (
            <li key={s} className="relative pb-7 last:pb-0">
              <span className="absolute -left-[2.15rem] flex h-7 w-7 items-center justify-center rounded-full bg-royal text-sm text-cream" aria-hidden="true">
                {i + 1}
              </span>
              <p>{s}</p>
            </li>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}
