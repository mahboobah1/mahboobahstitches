import { useCallback, useEffect, useState } from "react";
import { errText } from "../../components/admin/kit";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/orderStatus";
import { usePageMeta } from "../../lib/usePageMeta";

export default function AdminSubscribersPage() {
  usePageMeta("Subscribers");
  const [rows, setRows] = useState<{ id: string; email: string; source: string | null; createdAt: number }[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => { api<{ subscribers: { id: string; email: string; source: string | null; createdAt: number }[] }>("/api/admin/subscribers").then((d) => setRows(d.subscribers)).catch((e) => setError(errText(e))); }, []);
  useEffect(load, [load]);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3"><h1 className="text-4xl">Newsletter subscribers</h1><a className="btn-ghost" href="/api/admin/export/subscribers.csv">Download list (CSV)</a></div>
      <p className="mt-2 max-w-xl text-sm text-royal/75">People who joined from the website. Download the list to use with a free email tool of your choice, since this website does not send emails itself.</p>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {rows && rows.length === 0 && <p className="mt-6">No subscribers yet.</p>}
      <ul className="mt-6 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {rows?.map((s) => <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{s.email} <span className="text-royal/60">· {s.source} · {fmtDate(s.createdAt)}</span></span><button type="button" className="link-line" onClick={() => { if (window.confirm(`Remove ${s.email}?`)) void api(`/api/admin/subscribers/${s.id}`, { method: "DELETE" }).then(load); }}>Remove</button></li>)}
      </ul>
    </>
  );
}
