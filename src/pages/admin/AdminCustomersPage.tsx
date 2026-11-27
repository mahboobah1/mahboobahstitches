import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, errText } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { fmtWhen } from "../../lib/bookingTime";
import { formatMoney } from "../../lib/format";
import { fmtDate, isPaidStatus, orderStatusLabel } from "../../lib/orderStatus";
import { usePageMeta } from "../../lib/usePageMeta";

interface Row { id: string; name: string; email: string; phone: string | null; createdAt: number; paidOrders: number; spentMinor: number }

export default function AdminCustomersPage() {
  usePageMeta("Customers");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { const t = window.setTimeout(() => { api<{ customers: Row[] }>(`/api/admin/customers?q=${encodeURIComponent(q)}`).then((d) => setRows(d.customers)).catch((e) => setError(errText(e))); }, 250); return () => window.clearTimeout(t); }, [q]);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3"><h1 className="text-4xl">Customers</h1><a className="btn-ghost" href="/api/admin/export/customers.csv">Download spreadsheet (CSV)</a></div>
      <div className="mt-6 max-w-sm"><FormField label="Search name or email" type="search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!rows && !error && <p className="mt-6" role="status">Loading…</p>}
      {rows && rows.length === 0 && <p className="mt-6">No customers match.</p>}
      <ul className="mt-6 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {rows?.map((c) => <li key={c.id}><Link to={`/admin/customers/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 py-4"><span><span className="font-display text-xl">{c.name}</span><span className="block text-xs text-royal/70">{c.email} · joined {fmtDate(c.createdAt)}</span></span><span className="text-sm">{c.paidOrders} paid {c.paidOrders === 1 ? "order" : "orders"} · {formatMoney(c.spentMinor)}</span></Link></li>)}
      </ul>
    </>
  );
}

interface Detail { customer: { name: string; email: string; phone: string | null; createdAt: number }; orders: { id: string; number: string; status: string; currency: string; totalMinor: number; createdAt: number }[]; bookings: { id: string; reference: string; status: string; startsAt: number; type: string }[]; bespoke: { id: string; reference: string; category: string; status: string }[]; addresses: { label: string | null; recipientName: string; line1: string; city: string; state: string; countryCode: string }[] }

export function AdminCustomerPage() {
  const { id = "" } = useParams();
  usePageMeta("Customer");
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<Detail>(`/api/admin/customers/${id}`).then(setD).catch((e) => setError(errText(e))); }, [id]);
  if (!d) return error ? <p role="alert" className="text-[#9b2c2c]">{error}</p> : <p role="status">Loading…</p>;
  const c = d.customer;
  return (
    <>
      <Link to="/admin/customers" className="link-line text-sm">← Customers</Link>
      <h1 className="mt-2 text-4xl">{c.name}</h1>
      <p className="mt-1 text-sm">{c.email}{c.phone ? ` · ${c.phone}` : ""} · joined {fmtDate(c.createdAt)}</p>
      <h2 className="mt-8 !text-2xl">Orders</h2>
      <ul className="mt-2 space-y-2 text-sm">{d.orders.map((o) => <li key={o.id}><Link className="link-line" to={`/admin/orders/${o.id}`}>{o.number}</Link> · <Badge tone={isPaidStatus(o.status) ? "good" : "plain"}>{orderStatusLabel[o.status] ?? o.status}</Badge> · {formatMoney(o.totalMinor, o.currency)} · {fmtDate(o.createdAt)}</li>)}{d.orders.length === 0 && <li>None.</li>}</ul>
      <h2 className="mt-8 !text-2xl">Bookings</h2>
      <ul className="mt-2 space-y-2 text-sm">{d.bookings.map((b) => <li key={b.id}><Link className="link-line" to={`/admin/bookings/${b.id}`}>{b.type}</Link> · {fmtWhen(b.startsAt, 60)} · {b.status}</li>)}{d.bookings.length === 0 && <li>None.</li>}</ul>
      <h2 className="mt-8 !text-2xl">Custom requests</h2>
      <ul className="mt-2 space-y-2 text-sm">{d.bespoke.map((b) => <li key={b.id}><Link className="link-line" to={`/admin/bespoke/${b.id}`}>{b.category} {b.reference}</Link> · {b.status}</li>)}{d.bespoke.length === 0 && <li>None.</li>}</ul>
      <h2 className="mt-8 !text-2xl">Saved addresses</h2>
      <ul className="mt-2 space-y-2 text-sm">{d.addresses.map((a, i) => <li key={i}>{a.label ?? "Address"}: {a.recipientName}, {a.line1}, {a.city}, {a.state} {a.countryCode}</li>)}{d.addresses.length === 0 && <li>None.</li>}</ul>
    </>
  );
}
