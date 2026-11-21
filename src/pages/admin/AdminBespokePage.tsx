import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, errText } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { staffStatus } from "../../lib/bespokeStatus";
import { formatMoney } from "../../lib/format";
import { fmtDate } from "../../lib/orderStatus";
import { usePageMeta } from "../../lib/usePageMeta";

interface Row { id: string; reference: string; name: string; email: string; category: string; status: string; deadline: number | null; createdAt: number; quoteMinor: number | null }

export default function AdminBespokePage() {
  usePageMeta("Bespoke requests");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => { api<{ requests: Row[] }>(`/api/admin/bespoke?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`).then((d) => setRows(d.requests)).catch((e) => setError(errText(e))); }, 250);
    return () => window.clearTimeout(t);
  }, [status, q]);
  return (
    <>
      <h1 className="text-4xl">Bespoke requests</h1>
      <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
        <div><label htmlFor="b-status" className="mb-1 block text-sm">Show</label>
          <select id="b-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All requests</option>{Object.entries(staffStatus).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <FormField label="Search reference, name or email" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!rows && !error && <p className="mt-6" role="status">Loading…</p>}
      {rows && rows.length === 0 && <p className="mt-6">No requests match.</p>}
      <ul className="mt-6 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {rows?.map((r) => (
          <li key={r.id}><Link to={`/admin/bespoke/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 py-4">
            <span><span className="font-display text-xl">{r.category}</span> <span className="text-sm text-royal/70">{r.reference}</span><span className="block text-xs text-royal/70">{r.name} · {fmtDate(r.createdAt)}{r.deadline ? ` · needed by ${new Date(r.deadline * 1000).toLocaleDateString()}` : ""}</span></span>
            <span className="flex items-center gap-3"><Badge tone={r.status === "submitted" ? "warn" : r.status === "completed" ? "good" : "plain"}>{staffStatus[r.status] ?? r.status}</Badge>{r.quoteMinor ? formatMoney(r.quoteMinor) : ""}</span>
          </Link></li>
        ))}
      </ul>
    </>
  );
}
