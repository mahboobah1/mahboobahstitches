import { useEffect, useState } from "react";
import { errText } from "../../components/admin/kit";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { usePageMeta } from "../../lib/usePageMeta";

interface A {
  days: number; note: string;
  totals: { revenueMinor: number; orders: number; averageOrderMinor: number; unitsSold: number; newCustomers: number; newSubscribers: number; bookings: number; bespokeRequests: number; giftOrders: number };
  daily: { date: string; revenueMinor: number; orders: number }[];
  topProducts: { name: string; qty: number; revenueMinor: number }[]; byCollection: { name: string; qty: number; revenueMinor: number }[];
  lowStock: { name: string; sku: string; size: string; colour: string; onHand: number; available: number }[];
  ordersByStatus: { status: string; n: number }[]; promotions: { code: string; orders: number; discountMinor: number }[];
}

/** A simple bar chart drawn as SVG (no extra library). Each bar is a day's paid revenue. */
function Bars({ daily }: { daily: A["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.revenueMinor));
  const w = 100 / daily.length;
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={`Daily paid revenue for the last ${daily.length} days`}>
      {daily.map((d, i) => { const h = (d.revenueMinor / max) * 36; return <rect key={d.date} x={i * w + w * 0.12} y={38 - h} width={w * 0.76} height={Math.max(h, d.revenueMinor > 0 ? 0.6 : 0)} fill="#183B63"><title>{`${d.date}: ${formatMoney(d.revenueMinor)} (${d.orders} orders)`}</title></rect>; })}
      <line x1="0" y1="38" x2="100" y2="38" stroke="#B69A65" strokeWidth="0.4" />
    </svg>
  );
}

export default function AdminAnalyticsPage() {
  usePageMeta("Analytics");
  const [days, setDays] = useState(30);
  const [a, setA] = useState<A | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { setA(null); api<A>(`/api/admin/analytics?days=${days}`).then(setA).catch((e) => setError(errText(e))); }, [days]);
  const t = a?.totals;
  const tiles: [string, string][] = t ? [["Paid revenue", formatMoney(t.revenueMinor)], ["Paid orders", String(t.orders)], ["Average order", formatMoney(t.averageOrderMinor)], ["Units sold", String(t.unitsSold)], ["Gift orders", String(t.giftOrders)], ["New customers", String(t.newCustomers)], ["New subscribers", String(t.newSubscribers)], ["Bookings made", String(t.bookings)], ["Custom requests", String(t.bespokeRequests)]] : [];
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl">Analytics</h1>
        <a className="btn-ghost" href={`/api/admin/export/orders.csv?days=${days}`}>Download orders (CSV)</a>
      </div>
      <div className="mt-5 max-w-xs"><label htmlFor="an-d" className="mb-1 block text-sm">Period</label><select id="an-d" className="field" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={365}>Last 12 months</option></select></div>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!a && !error && <p className="mt-6" role="status">Loading…</p>}
      {a && (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">{tiles.map(([k, v]) => <div key={k} className="border border-dashed border-gold p-4"><dt className="text-sm text-royal/75">{k}</dt><dd className="mt-1 font-display text-3xl">{v}</dd></div>)}</dl>
          <h2 className="mt-10 !text-2xl">Paid revenue by day</h2>
          <div className="mt-3 border border-gold p-3"><Bars daily={a.daily} /><p className="mt-1 flex justify-between text-xs text-royal/60"><span>{a.daily[0]?.date}</span><span>{a.daily[a.daily.length - 1]?.date}</span></p></div>
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <section><h2 className="!text-2xl">Top products</h2><ol className="mt-3 space-y-2 text-sm">{a.topProducts.map((p) => <li key={p.name} className="flex justify-between gap-3"><span>{p.name} <span className="text-royal/60">× {p.qty}</span></span><span>{formatMoney(p.revenueMinor)}</span></li>)}{a.topProducts.length === 0 && <li>No sales in this period.</li>}</ol></section>
            <section><h2 className="!text-2xl">Sales by collection</h2><ul className="mt-3 space-y-2 text-sm">{a.byCollection.map((c) => <li key={c.name} className="flex justify-between gap-3"><span>{c.name} <span className="text-royal/60">× {c.qty}</span></span><span>{formatMoney(c.revenueMinor)}</span></li>)}{a.byCollection.length === 0 && <li>No sales in this period.</li>}</ul></section>
            <section><h2 className="!text-2xl">Running low</h2><ul className="mt-3 space-y-2 text-sm">{a.lowStock.map((s, i) => <li key={i} className="flex justify-between gap-3"><span>{s.name}{[s.size, s.colour].filter(Boolean).length ? ` (${[s.size, s.colour].filter(Boolean).join(", ")})` : ""}</span><span className={s.available <= 0 ? "text-[#9b2c2c]" : ""}>{s.available <= 0 ? "sold out" : `${s.available} left`}</span></li>)}{a.lowStock.length === 0 && <li>Nothing is running low.</li>}</ul></section>
            <section><h2 className="!text-2xl">Orders by stage</h2><ul className="mt-3 space-y-1 text-sm">{a.ordersByStatus.map((o) => <li key={o.status} className="flex justify-between"><span>{o.status.replace("_", " ")}</span><span>{o.n}</span></li>)}{a.ordersByStatus.length === 0 && <li>No orders in this period.</li>}</ul>
              {a.promotions.length > 0 && <><h3 className="mt-5 !text-xl">Discount codes used</h3><ul className="mt-2 space-y-1 text-sm">{a.promotions.map((p) => <li key={p.code} className="flex justify-between"><span>{p.code} × {p.orders}</span><span>−{formatMoney(p.discountMinor)}</span></li>)}</ul></>}</section>
          </div>
          <p className="mt-10 text-xs text-royal/60">{a.note}</p>
        </>
      )}
    </>
  );
}
