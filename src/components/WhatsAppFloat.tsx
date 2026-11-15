import { Link } from "react-router-dom";
import { hasWhatsapp, site } from "../config/site";
import { generalEnquiryLink } from "../lib/whatsapp";
import { WhatsAppIcon } from "./Icons";

/** Floating chat button. Opens WhatsApp once site.whatsappNumber is set, else the contact page. */
export function WhatsAppFloat() {
  const cls =
    "fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1f7a4d] text-white shadow-lg hover:bg-[#186a42]";
  const label = `Chat with ${site.name} on WhatsApp`;
  if (!hasWhatsapp) {
    return (
      <Link to="/contact" className={cls} aria-label={label} style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        <WhatsAppIcon className="h-7 w-7" />
      </Link>
    );
  }
  return (
    <a
      href={generalEnquiryLink("I have a question.")}
      target="_blank"
      rel="noopener noreferrer"
      className={cls}
      aria-label={label}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
