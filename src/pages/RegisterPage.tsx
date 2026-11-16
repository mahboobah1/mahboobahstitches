import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { FormError, FormField } from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { safeNext } from "../lib/safeNext";
import { usePageMeta } from "../lib/usePageMeta";

export default function RegisterPage() {
  usePageMeta("Create an account");
  const { user, register, status } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 10) {
      setError("Use a password of at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      await register({ fullName, email, password, phone: phone || undefined });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap max-w-md py-12 sm:py-16">
      <h1 className="text-4xl">Create an account</h1>
      {status === "unavailable" && <div className="mt-4"><FormError message="Account services are not available on this address yet." /></div>}
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <FormField label="Full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <FormField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <FormField label="Phone (optional)" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <FormField label="Password" type="password" autoComplete="new-password" hint="At least 10 characters." value={password} onChange={(e) => setPassword(e.target.value)} required />
        <FormError message={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm">
        Already registered?{" "}
        <Link to={`/account/login?next=${encodeURIComponent(next)}`} className="link-line">
          Sign in
        </Link>
      </p>
    </div>
  );
}
