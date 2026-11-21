import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Badge, errText } from "../components/admin/kit";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { fmtWhen } from "../lib/bookingTime";
import { usePageMeta } from "../lib/usePageMeta";

interface Row { reference: string; status: string; startsAt: number; type: string }

export default function AccountBookingsPage() {
  usePageMeta("My bookings");
  const { user, status } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tz, setTz] = useState(60);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    api<{ bookings: Row[] }>("/api/account/bookings").then((d) => setRows(d.bookings)).catch((e) => setError(errText(e)));
    api<{ tzOffsetMinutes: number }>("/api/bookings/config").then((c) => setTz(c.tzOffsetMinutes)).catch(() => undefined);
  }, [user]);
  if (status === "loading") return <div className="wrap py-20 text-center" role="status">Loading…</div>;
  if (!user) return <Navigate to="/account/login?next=/account/bookings" replace />;
  return (
    <div className="wrap max-w-2xl py-12 sm:py-16">
      <Link to="/account" className="link-line text-sm">← My account</Link>
      <h1 className="mt-2 text-4xl">My bookings</h1>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {rows && rows.length === 0 && <p className="mt-6">No bookings yet. <Link to="/bookings" className="link-line">Book a time</Link>.</p>}
      <ul className="mt-6 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {rows?.map((r) => <li key={r.reference}><Link to={`/bookings/${r.reference}`} className="flex flex-wrap items-center justify-between gap-2 py-4"><span><span className="font-display text-xl">{r.type}</span><span className="block text-xs text-royal/70">{fmtWhen(r.startsAt, tz)}</span></span><Badge tone={r.status === "confirmed" ? "good" : r.status === "requested" ? "warn" : "plain"}>{r.status}</Badge></Link></li>)}
      </ul>
    </div>
  );
}
