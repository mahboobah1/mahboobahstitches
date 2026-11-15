import { Link } from "react-router-dom";
import { hasWhatsapp } from "../config/site";
import { generalEnquiryLink } from "../lib/whatsapp";
import { usePageMeta } from "../lib/usePageMeta";

interface Props {
  title: string;
  phase: string;
  body: string;
  /** Short WhatsApp topic so customers can still get help today. */
  whatsappTopic?: string;
}

/** Honest placeholder for pages built in later phases. No fake forms or buttons. */
export default function ComingSoonPage({ title, phase, body, whatsappTopic }: Props) {
  usePageMeta(title);
  return (
    <div className="wrap max-w-2xl py-20 text-center">
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-5 text-lg text-royal/85">{body}</p>
      <p className="mt-2 text-sm text-royal/60">Planned for {phase}.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {whatsappTopic && (
          <a href={generalEnquiryLink(whatsappTopic)} target={hasWhatsapp ? "_blank" : undefined} rel="noopener noreferrer" className="btn-primary">
            Ask on WhatsApp
          </a>
        )}
        <Link to="/shop" className="btn-ghost">Browse the shop</Link>
      </div>
    </div>
  );
}
