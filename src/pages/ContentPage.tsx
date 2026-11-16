import { useEffect, useState, type ReactNode } from "react";
import { RichText } from "../components/RichText";
import { api, ApiError } from "../lib/api";
import { usePageMeta } from "../lib/usePageMeta";

interface Page {
  slug: string;
  kind: string;
  title: string;
  body: string;
  publishedAt: number | null;
}

/**
 * A page whose words are written in Admin > Pages. If the owner has not published one for this
 * address yet, the `fallback` (a "coming soon" message) is shown instead.
 */
export default function ContentPage({ slug, fallback }: { slug: string; fallback: ReactNode }) {
  const [state, setState] = useState<"loading" | "missing" | "ready">("loading");
  const [page, setPage] = useState<Page | null>(null);
  usePageMeta(page?.title);

  useEffect(() => {
    let alive = true;
    setState("loading");
    api<{ page: Page }>(`/api/content/pages/${encodeURIComponent(slug)}`)
      .then((d) => {
        if (!alive) return;
        setPage(d.page);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (alive) setState(e instanceof ApiError || e instanceof Error ? "missing" : "missing");
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (state === "loading") return <div className="wrap py-20 text-center" role="status">Loading…</div>;
  if (state === "missing" || !page) return <>{fallback}</>;
  return (
    <article className="wrap max-w-2xl py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">{page.title}</h1>
      {page.kind === "journal" && page.publishedAt && (
        <p className="mt-2 text-sm text-royal/70">{new Date(page.publishedAt * 1000).toLocaleDateString()}</p>
      )}
      <div className="mt-8"><RichText text={page.body} /></div>
    </article>
  );
}
