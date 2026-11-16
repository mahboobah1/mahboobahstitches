import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { usePageMeta } from "../lib/usePageMeta";

interface Overview {
  customers: number;
  staff: number;
  products: number;
  orders: number;
  unpaidOrders: number;
  openBookings: number;
  openBespoke: number;
}

const tiles: { key: keyof Overview; label: string }[] = [
  { key: "customers", label: "Customers" },
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "unpaidOrders", label: "Unpaid orders" },
  { key: "openBookings", label: "Open bookings" },
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
        <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.key} className="border border-dashed border-gold p-4">
              <dt className="text-sm text-royal/75">{t.label}</dt>
              <dd className="mt-1 font-display text-4xl">{data[t.key]}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-10 text-sm text-royal/70">
        Products, inventory, orders and the other management screens are added in the next phases.
      </p>
    </>
  );
}
