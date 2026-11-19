import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, errText } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { fmtDate, isPaidStatus, orderStatusLabel } from "../../lib/orderStatus";
import { usePageMeta } from "../../lib/usePageMeta";

interface Row { id: string; number: string; status: string; currency: string; totalMinor: number; name: string | null; email: string | null; createdAt: number }

export default function AdminOrdersPage() {
  usePageMeta("Orders");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => {
      api<{ orders: Row[] }>(`/api/admin/orders?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`).then((d) => setRows(d.orders)).catch((e) => setError(errText(e)));
    }, 250);
    return () => window.clearTimeout(t);
  }, [status, q]);
  return (
    <>
      <h1 className="text-4xl">Orders</h1>
      <p className="mt-2 max-w-xl text-sm text-royal/75">Only orders placed on the website with online payment appear here. A WhatsApp enquiry is not an order until it is paid.</p>
      <div className="mt-6 grid max-w-xl gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="o-status" className="mb-1 block text-sm">Show</label>
          <select id="o-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All orders</option>
            {Object.entries(orderStatusLabel).filter(([k]) => k !== "enquiry").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <FormField label="Search number, name or email" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!rows && !error && <p className="mt-6" role="status">Loading…</p>}
      {rows && rows.length === 0 && <p className="mt-6">No orders match.</p>}
      <ul className="mt-6 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {rows?.map((r) => (
          <li key={r.id}>
            <Link to={`/admin/orders/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 py-4">
              <span><span className="font-display text-xl">{r.number}</span><span className="block text-xs text-royal/70">{r.name} · {fmtDate(r.createdAt)}</span></span>
              <span className="flex items-center gap-3"><Badge tone={isPaidStatus(r.status) ? "good" : r.status === "unpaid" ? "warn" : "plain"}>{orderStatusLabel[r.status] ?? r.status}</Badge>{formatMoney(r.totalMinor, r.currency)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
