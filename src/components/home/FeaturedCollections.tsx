import { Link } from "react-router-dom";
import { collections } from "../../data/collections";
import { PlaceholderImage } from "../PlaceholderImage";

export function FeaturedCollections() {
  return (
    <section className="section bg-cream-deep/60" aria-labelledby="collections-title">
      <div className="wrap">
        <div className="flex items-end justify-between gap-4">
          <h2 id="collections-title">Our collections</h2>
          <Link to="/collections" className="link-line shrink-0 text-sm">
            View all
          </Link>
        </div>
        <ul className="mt-9 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8">
          {collections.map((c, i) => (
            <li key={c.slug} className={i % 2 === 1 ? "md:mt-10" : ""}>
              <Link to={`/collections/${c.slug}`} className="group block">
                <PlaceholderImage label={c.name} tone={i % 3 === 2 ? "royal" : "powder"} className="arch aspect-[3/4] w-full" showLabel={false} />
                <h3 className="mt-3">{c.name}</h3>
                <p className="mt-1 hidden text-sm text-royal/75 sm:block">{c.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
