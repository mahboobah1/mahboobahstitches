import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormError, FormField } from "../components/FormField";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { usePageMeta } from "../lib/usePageMeta";

export default function AdminSetupPage() {
  usePageMeta("Owner setup");
  const { setupOwner } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "open" | "closed" | "unconfigured" | "unavailable">("loading");
  const [setupToken, setSetupToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ needsOwner: boolean; tokenConfigured: boolean }>("/api/setup/status")
      .then((d) => setState(!d.needsOwner ? "closed" : d.tokenConfigured ? "open" : "unconfigured"))
      .catch(() => setState("unavailable"));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await setupOwner({ setupToken, fullName, email, password });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap max-w-md py-12 sm:py-16">
      <h1 className="text-4xl">Owner setup</h1>
      {state === "loading" && <p className="mt-6" role="status">Checking…</p>}
      {state === "unavailable" && <div className="mt-6"><FormError message="The server is not reachable at this address. Deploy to Cloudflare first." /></div>}
      {state === "unconfigured" && <div className="mt-6"><FormError message="The SETUP_TOKEN secret has not been added to the deployment yet." /></div>}
      {state === "closed" && (
        <p className="mt-6 text-royal/80">
          An owner account already exists, so this page is closed. <Link to="/account/login?next=/admin" className="link-line">Sign in</Link>.
        </p>
      )}
      {state === "open" && (
        <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
          <p className="text-sm text-royal/80">Create the one owner account. You need the setup code you saved as the SETUP_TOKEN secret.</p>
          <FormField label="Setup code" type="password" autoComplete="off" value={setupToken} onChange={(e) => setSetupToken(e.target.value)} required />
          <FormField label="Your full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <FormField label="Owner email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <FormField label="Password" type="password" autoComplete="new-password" hint="At least 10 characters. Use one you have not used elsewhere." value={password} onChange={(e) => setPassword(e.target.value)} required />
          <FormError message={error} />
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create owner account"}</button>
        </form>
      )}
    </div>
  );
}
