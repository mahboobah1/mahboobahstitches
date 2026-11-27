import { useCallback, useEffect, useState } from "react";
import { Badge, Notice, errText, type Msg } from "../../components/admin/kit";
import { Stars } from "../../components/Reviews";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/orderStatus";
import { usePageMeta } from "../../lib/usePageMeta";

interface R { id: string; rating: number; title: string | null; body: string; status: string; createdAt: number; customer: string; email: string; product: string }

export default function AdminReviewsPage() {
  usePageMeta("Reviews");
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState<R[] | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const load = useCallback(() => { setRows(null); api<{ reviews: R[] }>(`/api/admin/reviews?status=${status}`).then((d) => setRows(d.reviews)).catch((e) => setMsg({ ok: false, text: errText(e) })); }, [status]);
  useEffect(load, [load]);
  const set = async (id: string, s: string) => { setMsg(null); try { await api(`/api/admin/reviews/${id}`, { method: "PUT", body: { status: s } }); load(); } catch (e) { setMsg({ ok: false, text: errText(e) }); } };
  return (
    <>
      <h1 className="text-4xl">Reviews</h1>
      <p className="mt-2 max-w-xl text-sm text-royal/75">Only customers who bought a product can review it. A review appears on the website after you approve it.</p>
      <div className="mt-5 max-w-xs"><label htmlFor="rv-s" className="mb-1 block text-sm">Show</label><select id="rv-s" className="field" value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">Waiting for approval</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="">All</option></select></div>
      <Notice msg={msg} />
      {!rows && <p className="mt-6" role="status">Loading…</p>}
      {rows && rows.length === 0 && <p className="mt-6">Nothing here.</p>}
      <ul className="mt-6 space-y-4">
        {rows?.map((r) => (
          <li key={r.id} className="border border-dashed border-gold p-4">
            <p><Stars n={r.rating} /> {r.title && <strong className="ml-2">{r.title}</strong>} <Badge tone={r.status === "approved" ? "good" : r.status === "pending" ? "warn" : "plain"}>{r.status}</Badge></p>
            <p className="mt-2 text-sm">{r.body}</p>
            <p className="mt-1 text-xs text-royal/60">{r.product} · {r.customer} ({r.email}) · {fmtDate(r.createdAt)}</p>
            <div className="mt-3 flex gap-3">{r.status !== "approved" && <button type="button" className="btn-primary" onClick={() => void set(r.id, "approved")}>Approve</button>}{r.status !== "rejected" && <button type="button" className="btn-ghost" onClick={() => void set(r.id, "rejected")}>Reject</button>}</div>
          </li>
        ))}
      </ul>
    </>
  );
}
