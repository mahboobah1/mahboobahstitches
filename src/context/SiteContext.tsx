import { useEffect, useState, type ReactNode } from "react";
import { site } from "../config/site";
import { api } from "../lib/api";
import { Logo } from "../components/Logo";

interface PublicSite {
  whatsappNumber: string;
  phone: string;
  email: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  address: string;
  openingHours: string;
  announcement: string;
  demoMode: boolean;
}

/**
 * Loads the business details the owner saved in Admin > Settings and applies them to the shared
 * `site` object BEFORE the pages render, so every page shows the live values.
 * If the server is unreachable, the built-in fallbacks in src/config/site.ts are used.
 */
export function SiteProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const timer = window.setTimeout(finish, 3000);
    api<PublicSite>("/api/site")
      .then((s) => {
        site.whatsappNumber = s.whatsappNumber;
        site.phone = s.phone;
        site.email = s.email;
        site.instagram = s.instagram;
        site.tiktok = s.tiktok;
        site.facebook = s.facebook;
        site.address = s.address;
        site.openingHours = s.openingHours;
        site.announcement = s.announcement;
        site.demoMode = s.demoMode;
      })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timer);
        finish();
      });
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream" role="status" aria-label="Loading">
        <Logo asLink={false} eager className="h-24 w-auto opacity-80" />
      </div>
    );
  }
  return <>{children}</>;
}
