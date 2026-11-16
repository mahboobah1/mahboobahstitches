import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { usePageMeta } from "../lib/usePageMeta";

interface Entry {
  id: number;
  action: string;
  actorEmail: string | null;
  ip: string | null;
  createdAt: number;
}

export default function AdminAuditPage() {
  usePageMeta("Audit log");
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ entries: Entry[] }>("/api/admin/audit")
      .then((d) => setRows(d.entries))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load."));
  }, []);

  return (
    <>
      <h1 className="text-4xl">Audit log</h1>
      <p className="mt-2 text-sm text-royal/70">The latest 100 security and account events.</p>
      {error && <p role="alert" className="mt-6 text-[#9b2c2c]">{error}</p>}
      {!rows && !error && <p className="mt-6" role="status">Loading…</p>}
      {rows && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-gold"><th className="py-2 pr-4">When</th><th className="pr-4">Event</th><th className="pr-4">Who</th><th>IP</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-dashed border-gold/60">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.createdAt * 1000).toLocaleString()}</td>
                  <td className="pr-4">{r.action}</td>
                  <td className="pr-4">{r.actorEmail ?? "n/a"}</td>
                  <td>{r.ip ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="mt-4">No events yet.</p>}
        </div>
      )}
    </>
  );
}
