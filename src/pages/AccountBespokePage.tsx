import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Badge, errText } from "../components/admin/kit";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { customerStatus } from "../lib/bespokeStatus";
import { fmtDate } from "../lib/orderStatus";
import { usePageMeta } from "../lib/usePageMeta";

interface Row { reference: string; category: string; status: string; createdAt: number }

export default function AccountBespokePage() {
  usePageMeta("My custom orders");
  const { user, status } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (user) api<{ requests: Row[] }>("/api/account/bespoke").then((d) => setRows(d.requests)).catch((e) => setError(errText(e))); }, [user]);
  if (status === "loading") return <div className="wrap py-20 text-center" role="status">Loading…</div>;
  if (!user) return <Navigate to="/account/login?next=/account/bespoke" replace />;
  return (
    <div className="wrap max-w-2xl py-12 sm:py-16">
      <Link to="/account" className="link-line text-sm">← My account</Link>
      <h1 className="mt-2 text-4xl">My custom orders</h1>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {rows && rows.length === 0 && <p className="mt-6">No requests yet. <Link to="/bespoke" className="link-line">Start one</Link>.</p>}
      <ul className="mt-6 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {rows?.map((r) => <li key={r.reference}><Link to={`/bespoke/request/${r.reference}`} className="flex flex-wrap items-center justify-between gap-2 py-4"><span><span className="font-display text-xl">{r.category}</span><span className="block text-xs text-royal/70">{r.reference} · {fmtDate(r.createdAt)}</span></span><Badge tone={r.status === "awaiting_approval" ? "warn" : "plain"}>{customerStatus[r.status] ?? r.status}</Badge></Link></li>)}
      </ul>
    </div>
  );
}
