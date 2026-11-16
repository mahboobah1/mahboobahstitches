import { hasWhatsapp, site } from "../config/site";
import { usePageMeta } from "../lib/usePageMeta";
import { generalEnquiryLink } from "../lib/whatsapp";

const missing = <span className="text-royal/60">to be added by the business</span>;

export default function ContactPage() {
  usePageMeta("Contact", "Contact Mahboobah Stitches by WhatsApp, phone or email.");
  const row = "grid gap-1 border-b border-dashed border-gold py-4 sm:grid-cols-[10rem_1fr]";
  return (
    <div className="wrap max-w-3xl py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Contact us</h1>
      <p className="mt-3 text-lg text-royal/80">The quickest way to reach us is WhatsApp.</p>
      <a href={generalEnquiryLink("I have a question.")} target={hasWhatsapp() ? "_blank" : undefined} rel="noopener noreferrer" className="btn-primary mt-6">
        Chat on WhatsApp
      </a>
      <dl className="mt-10 border-t border-dashed border-gold">
        <div className={row}><dt className="font-medium">WhatsApp</dt><dd>{site.whatsappNumber ? `+${site.whatsappNumber.replace(/\D/g, "")}` : missing}</dd></div>
        <div className={row}><dt className="font-medium">Phone</dt><dd>{site.phone ? <a className="link-line" href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a> : missing}</dd></div>
        <div className={row}><dt className="font-medium">Email</dt><dd>{site.email ? <a className="link-line" href={`mailto:${site.email}`}>{site.email}</a> : missing}</dd></div>
        <div className={row}><dt className="font-medium">Hours</dt><dd>{site.openingHours || missing}</dd></div>
        <div className={row}><dt className="font-medium">Address</dt><dd>{site.address || missing}</dd></div>
      </dl>
    </div>
  );
}
