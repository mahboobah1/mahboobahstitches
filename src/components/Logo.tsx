import { Link } from "react-router-dom";
import { site } from "../config/site";

interface Props {
  className?: string;
  /** Link to the homepage when true (default). */
  asLink?: boolean;
  eager?: boolean;
}

/** The supplied brand logo. File: public/brand/logo.png (transparent) with logo.webp. */
export function Logo({ className = "h-14 w-auto", asLink = true, eager = false }: Props) {
  const img = (
    <picture>
      <source srcSet={`${import.meta.env.BASE_URL}brand/logo.webp`} type="image/webp" />
      <img
        src={`${import.meta.env.BASE_URL}brand/logo.png`}
        alt={`${site.name}: ${site.tagline}`}
        className={className}
        width={1000}
        height={670}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
  return asLink ? (
    <Link to="/" aria-label={`${site.name} home`} className="inline-block">
      {img}
    </Link>
  ) : (
    img
  );
}
