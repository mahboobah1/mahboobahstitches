import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, errText } from "../../components/admin/kit";
import { api } from "../../lib/api";
import { usePageMeta } from "../../lib/usePageMeta";

interface Row { id: string; slug: string; kind: string; title: string; isPublished: number; updatedAt: number }
const kindLabel: Record<string, string> = { page: "Page", journal: "Journal post", faq: "FAQ", policy: "Policy" };
const SUGGESTED = ["about", "faq", "policies"];

export default function AdminContentPage() {
  usePageMeta("Pages");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ pages: Row[] }>("/api/admin/pages").then((d) => setRows(d.pages)).catch((e) => setError(errText(e)));
  }, []);
  const missing = SUGGESTED.filter((s) => !rows?.some((r) => r.slug === s));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl">Pages and journal</h1>
        <Link to="/admin/content/new" className="btn-primary">New page</Link>
      </div>
      <p className="mt-2 max-w-xl text-sm text-royal/75">Write your About, FAQ and Policies pages and your journal posts here. A page only shows on the website once it is published.</p>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!rows && !error && <p className="mt-6" role="status">Loading…</p>}
      {rows && missing.length > 0 && (
        <p className="mt-4 text-sm">Still to write: {missing.map((m) => (<Link key={m} className="link-line mr-3" to={`/admin/content/new?slug=${m}`}>{m}</Link>))}</p>
      )}
      <ul className="mt-6 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {rows?.map((r) => (
          <li key={r.id}>
            <Link to={`/admin/content/${r.id}`} className="block py-4">
              <span className="font-display text-xl">{r.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-royal/75">
                <Badge tone={r.isPublished ? "good" : "warn"}>{r.isPublished ? "Published" : "Draft"}</Badge>
                {kindLabel[r.kind] ?? r.kind} · /{r.slug}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows && rows.length === 0 && <p className="mt-6">Nothing written yet.</p>}
    </>
  );
}
