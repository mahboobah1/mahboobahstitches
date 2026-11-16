import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Wraps every /admin page. The server enforces permissions too; this only hides what you cannot use. */
export function AdminLayout() {
  const { user, status, can, logout } = useAuth();
  const loc = useLocation();

  if (status === "loading") return <div className="wrap py-20 text-center" role="status">Loading…</div>;
  if (status === "unavailable")
    return <div className="wrap py-20 text-center">The server is not reachable at this address.</div>;
  if (!user)
    return (
      <div className="wrap max-w-md py-20 text-center">
        <h1 className="text-4xl">Admin</h1>
        <p className="mt-3 text-royal/80">Please sign in to continue.</p>
        <Link to={`/account/login?next=${encodeURIComponent(loc.pathname)}`} className="btn-primary mt-6">Sign in</Link>
      </div>
    );
  if (!can("admin:access"))
    return (
      <div className="wrap max-w-md py-20 text-center">
        <h1 className="text-4xl">No access</h1>
        <p className="mt-3 text-royal/80">This account does not have permission to use the admin area.</p>
        <Link to="/account" className="btn-ghost mt-6">Back to my account</Link>
      </div>
    );

  const link = ({ isActive }: { isActive: boolean }) => `py-2 text-sm ${isActive ? "border-b border-gold" : "hover:text-gold-deep"}`;
  return (
    <div className="wrap py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-gold pb-4">
        <nav aria-label="Admin" className="flex flex-wrap gap-5">
          <NavLink end to="/admin" className={link}>Overview</NavLink>
          {can("audit:read") && <NavLink to="/admin/audit" className={link}>Audit log</NavLink>}
        </nav>
        <p className="text-sm text-royal/75">
          {user.fullName} · {user.role.toLowerCase().replace("_", " ")}{" "}
          <button type="button" className="link-line ml-2" onClick={() => void logout()}>Sign out</button>
        </p>
      </div>
      <div className="pt-8"><Outlet /></div>
    </div>
  );
}
