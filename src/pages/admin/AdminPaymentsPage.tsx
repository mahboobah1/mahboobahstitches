import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, errText } from "../../components/admin/kit";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { fmtDate } from "../../lib/orderStatus";
import { usePageMeta } from "../../lib/usePageMeta";

interface P { id: string; provider: string; reference: string; amountMinor: number; currency: string; status: string; verifiedAt: number | null; createdAt: number; orderNumber: string; orderId: string }

export default function AdminPaymentsPage() {
  usePageMeta("Payments");
  const [rows, setRows] = useState<P[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<{ payments: P[] }>("/api/admin/payments").then((d) => setRows(d.payments)).catch((e) => setError(errText(e))); }, []);
  return (
    <>
      <h1 className="text-4xl">Payments</h1>
      <p className="mt-2 max-w-xl text-sm text-royal/75">Every payment attempt. “success” means the provider confirmed it to our server and the amount matched.</p>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!rows && !error && <p className="mt-6" role="status">Loading…</p>}
      {rows && rows.length === 0 && <p className="mt-6">No payments yet.</p>}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead><tr className="border-b border-gold"><th className="py-2 pr-4">When</th><th className="pr-4">Order</th><th className="pr-4">Amount</th><th className="pr-4">Provider</th><th>Status</th></tr></thead>
          <tbody>
            {rows?.map((p) => (
              <tr key={p.id} className="border-b border-dashed border-gold/60">
                <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                <td className="pr-4"><Link className="link-line" to={`/admin/orders/${p.orderId}`}>{p.orderNumber}</Link></td>
                <td className="pr-4">{formatMoney(p.amountMinor, p.currency)}</td>
                <td className="pr-4">{p.provider}</td>
                <td><Badge tone={p.status === "success" ? "good" : p.status === "failed" ? "warn" : "plain"}>{p.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
