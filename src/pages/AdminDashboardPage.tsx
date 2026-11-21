import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";

interface Overview {
  customers: number;
  staff: number;
  products: number;
  orders: number;
  unpaidOrders: number;
  ordersToFulfil: number;
  paidRevenueMinor: number;
  openBookings: number;
  openBespoke: number;
  newBespoke: number;
}

const tiles: { key: keyof Overview; label: string }[] = [
  { key: "customers", label: "Customers" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "ordersToFulfil", label: "Orders to prepare" },
  { key: "unpaidOrders", label: "Unpaid orders" },
  { key: "openBookings", label: "Upcoming bookings" },
  { key: "newBespoke", label: "New bespoke requests" },
  { key: "openBespoke", label: "Open bespoke requests" },
  { key: "staff", label: "Staff accounts" },
];

export default function AdminDashboardPage() {
  usePageMeta("Admin overview");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Overview>("/api/admin/overview").then(setData).catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load."));
  }, []);

  return (
    <>
      <h1 className="text-4xl">Overview</h1>
      <p className="mt-2 text-sm text-royal/70">Live counts from the database. Zero means nothing has been recorded yet.</p>
      {error && <p role="alert" className="mt-6 text-[#9b2c2c]">{error}</p>}
      {!data && !error && <p className="mt-6" role="status">Loading…</p>}
      {data && (
        <>
        <div className="mt-8 border border-gold p-4"><p className="text-sm text-royal/75">Paid revenue (verified payments only)</p><p className="mt-1 font-display text-4xl">{formatMoney(data.paidRevenueMinor)}</p></div>
        <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.key} className="border border-dashed border-gold p-4">
              <dt className="text-sm text-royal/75">{t.label}</dt>
              <dd className="mt-1 font-display text-4xl">{data[t.key]}</dd>
            </div>
          ))}
        </dl>
        </>
      )}
      <p className="mt-10 text-sm text-royal/70">
        Gift bundles, reviews, shipping rates and analytics are added in the next phases.
      </p>
    </>
  );
}
