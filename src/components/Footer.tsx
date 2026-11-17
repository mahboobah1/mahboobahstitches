import { Link } from "react-router-dom";
import { site } from "../config/site";
import { useCatalogue } from "../context/CatalogueContext";
import { Logo } from "./Logo";

const ext = "link-line";

export function Footer() {
  const { visibleCollections: collections } = useCatalogue();
  const social = [
    { label: "Instagram", href: site.instagram },
    { label: "TikTok", href: site.tiktok },
    { label: "Facebook", href: site.facebook },
  ].filter((s) => s.href);

  return (
    <footer className="mt-10 border-t border-gold/50 bg-powder">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.2fr_1fr_1fr_1.2fr]">
        <div>
          <Logo className="h-24 w-auto" />
          <p className="mt-4 max-w-xs text-sm text-royal/80">
            Modest fashion, custom styles and thoughtful gifts.
          </p>
        </div>

        <div>
          <h2 className="text-xl">Shop</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {collections.map((c) => (
              <li key={c.slug}>
                <Link className={ext} to={`/collections/${c.slug}`}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl">Help</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className={ext} to="/bespoke">Bespoke tailoring</Link></li>
            <li><Link className={ext} to="/bookings">Book a fitting</Link></li>
            <li><Link className={ext} to="/faq">FAQ</Link></li>
            <li><Link className={ext} to="/policies">Policies</Link></li>
            <li><Link className={ext} to="/journal">Journal</Link></li>
            <li><Link className={ext} to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl">Get in touch</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {/* Details come from src/config/site.ts. Empty values show a clear placeholder. */}
            <li>
              WhatsApp:{" "}
              {site.whatsappNumber ? (
                <a className={ext} href={`https://wa.me/${site.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  +{site.whatsappNumber.replace(/\D/g, "")}
                </a>
              ) : (
                <span className="text-royal/60">number to be added</span>
              )}
            </li>
            <li>
              Phone:{" "}
              {site.phone ? <a className={ext} href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a> : <span className="text-royal/60">to be added</span>}
            </li>
            <li>
              Email:{" "}
              {site.email ? <a className={ext} href={`mailto:${site.email}`}>{site.email}</a> : <span className="text-royal/60">to be added</span>}
            </li>
            {site.openingHours && <li>{site.openingHours}</li>}
            {site.address && <li>{site.address}</li>}
            {social.map((s) => (
              <li key={s.label}>
                <a className={ext} href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-gold/40 py-5 text-center text-xs text-royal/70">
        © {new Date().getFullYear()} {site.name}. {site.tagline}
      </div>
    </footer>
  );
}
