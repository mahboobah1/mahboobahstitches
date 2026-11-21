import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageMeta } from "../lib/usePageMeta";

export default function AccountPage() {
  usePageMeta("My account");
  const { user, status, logout, can } = useAuth();
  const [busy, setBusy] = useState(false);

  if (status === "loading") return <div className="wrap py-20 text-center" role="status">Loading…</div>;
  if (!user) return <Navigate to="/account/login?next=/account" replace />;

  return (
    <div className="wrap max-w-2xl py-12 sm:py-16">
      <h1 className="text-4xl">Hello, {user.fullName.split(" ")[0]}.</h1>
      <p className="mt-2 text-royal/75">{user.email}</p>
      <ul className="mt-8 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        <li><Link className="block py-4" to="/account/orders">My orders</Link></li>
        <li><Link className="block py-4" to="/account/wishlist">Wishlist</Link></li>
        <li><Link className="block py-4" to="/account/addresses">Addresses</Link></li>
        <li><Link className="block py-4" to="/account/bookings">Bookings</Link></li>
        <li><Link className="block py-4" to="/account/bespoke">Custom orders</Link></li>
        {can("admin:access") && <li><Link className="block py-4 font-medium" to="/admin">Open the admin area</Link></li>}
      </ul>
      <button
        type="button"
        className="btn-ghost mt-8"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await logout();
          setBusy(false);
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
