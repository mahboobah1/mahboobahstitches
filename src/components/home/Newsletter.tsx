import { hasWhatsapp, site } from "../../config/site";
import { generalEnquiryLink } from "../../lib/whatsapp";

/**
 * Email newsletters need an email service (a Phase 7 decision, to avoid paid tools).
 * Until then, customers can join updates through a WhatsApp message, which works today.
 */
export function Newsletter() {
  return (
    <section className="section" aria-labelledby="news-title">
      <div className="wrap max-w-2xl text-center">
        <h2 id="news-title">Hear about new styles first.</h2>
        <p className="mt-4 text-royal/85">
          Send us a quick message on WhatsApp and we will add you to our updates.
        </p>
        <a
          href={generalEnquiryLink("please add me to your updates about new styles.")}
          target={hasWhatsapp ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="btn-primary mt-6"
        >
          Join on WhatsApp
        </a>
        {!hasWhatsapp && <p className="mt-3 text-xs text-royal/60">{site.name} will add a WhatsApp number soon.</p>}
      </div>
    </section>
  );
}
