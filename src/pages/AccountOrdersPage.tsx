import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Badge, errText } from "../components/admin/kit";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { fmtDate, isPaidStatus, orderStatusLabel } from "../lib/orderStatus";
import { usePageMeta } from "../lib/usePageMeta";

interface Row { number: string; status: string; currency: string; totalMinor: number; createdAt: number }

export default function AccountOrdersPage() {
  usePageMeta("My orders");
  const { user, status } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (user) api<{ orders: Row[] }>("/api/account/orders").then((d) => setRows(d.orders)).catch((e) => setError(errText(e)));
  }, [user]);
  if (status === "loading") return <div className="wrap py-20 text-center" role="status">Loading…</div>;
  if (!user) return <Navigate to="/account/login?next=/account/orders" replace />;
  return (
    <div className="wrap max-w-2xl py-12 sm:py-16">
      <Link to="/account" className="link-line text-sm">← My account</Link>
      <h1 className="mt-2 text-4xl">My orders</h1>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!rows && !error && <p className="mt-6" role="status">Loading…</p>}
      {rows && rows.length === 0 && <p className="mt-6">No orders yet. <Link to="/shop" className="link-line">Browse the shop</Link>.</p>}
      <ul className="mt-6 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {rows?.map((r) => (
          <li key={r.number}>
            <Link to={`/order/${r.number}`} className="flex flex-wrap items-center justify-between gap-2 py-4">
              <span><span className="font-display text-xl">{r.number}</span><span className="block text-xs text-royal/70">{fmtDate(r.createdAt)}</span></span>
              <span className="flex items-center gap-3"><Badge tone={isPaidStatus(r.status) ? "good" : r.status === "unpaid" ? "warn" : "plain"}>{orderStatusLabel[r.status] ?? r.status}</Badge>{formatMoney(r.totalMinor, r.currency)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
