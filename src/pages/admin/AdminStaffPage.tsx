import { useEffect, useState } from "react";
import { CheckField, Notice, SelectField, errText, type Msg } from "../../components/admin/kit";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { usePageMeta } from "../../lib/usePageMeta";

interface U { id: string; email: string; fullName: string; role: string; isActive: number; createdAt: number }
const roles = [
  ["CUSTOMER", "Customer (no admin access)"],
  ["CONTENT_MANAGER", "Content manager (pages and journal)"],
  ["INVENTORY_MANAGER", "Inventory manager (products and stock)"],
  ["MANAGER", "Manager (products, stock, orders)"],
  ["OWNER", "Owner (everything)"],
];

export default function AdminStaffPage() {
  usePageMeta("People");
  const { user } = useAuth();
  const [users, setUsers] = useState<U[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ users: U[] }>("/api/admin/staff").then((d) => setUsers(d.users)).catch((e) => setError(errText(e)));
  }, []);

  return (
    <>
      <h1 className="text-4xl">People and access</h1>
      <p className="mt-2 max-w-xl text-sm text-royal/75">Someone creates a normal account first at /account/register, then you give them a role here. Changes take effect immediately.</p>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!users && !error && <p className="mt-6" role="status">Loading…</p>}
      <ul className="mt-6 space-y-4">
        {users?.map((u) => <UserRow key={u.id} u={u} self={u.id === user?.id} />)}
      </ul>
    </>
  );
}

function UserRow({ u, self }: { u: U; self: boolean }) {
  const [role, setRole] = useState(u.role);
  const [active, setActive] = useState(u.isActive === 1);
  const [msg, setMsg] = useState<Msg | null>(null);
  const save = async () => {
    setMsg(null);
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PUT", body: { role, isActive: active } });
      setMsg({ ok: true, text: "Saved." });
    } catch (e) { setMsg({ ok: false, text: errText(e) }); }
  };
  return (
    <li className="border border-dashed border-gold p-4">
      <p className="font-medium">{u.fullName} {self && <span className="font-normal text-royal/70">(you)</span>}</p>
      <p className="text-sm text-royal/75">{u.email} · joined {new Date(u.createdAt * 1000).toLocaleDateString()}</p>
      {self ? (
        <p className="mt-2 text-sm">Your own access cannot be changed here.</p>
      ) : (
        <>
          <div className="mt-3 max-w-sm">
            <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </SelectField>
          </div>
          <CheckField label="Account is active" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <div className="flex items-center gap-4">
            <button type="button" className="btn-primary" onClick={save}>Save</button>
            <Notice msg={msg} />
          </div>
        </>
      )}
    </li>
  );
}
