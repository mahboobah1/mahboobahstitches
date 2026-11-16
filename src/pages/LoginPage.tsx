import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { FormError, FormField } from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { safeNext } from "../lib/safeNext";
import { usePageMeta } from "../lib/usePageMeta";

export default function LoginPage() {
  usePageMeta("Sign in");
  const { user, login, status } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap max-w-md py-12 sm:py-16">
      <h1 className="text-4xl">Sign in</h1>
      {status === "unavailable" && <div className="mt-4"><FormError message="Account services are not available on this address yet." /></div>}
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <FormField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <FormField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <FormError message={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm">
        New here?{" "}
        <Link to={`/account/register?next=${encodeURIComponent(next)}`} className="link-line">
          Create an account
        </Link>
      </p>
    </div>
  );
}
