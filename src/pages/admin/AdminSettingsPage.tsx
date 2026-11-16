import { useEffect, useState, type FormEvent } from "react";
import { CheckField, Notice, errText, type Msg } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { usePageMeta } from "../../lib/usePageMeta";

type S = {
  whatsappNumber: string; phone: string; email: string; instagram: string; tiktok: string; facebook: string;
  address: string; openingHours: string; announcement: string; demoMode: boolean;
};

export default function AdminSettingsPage() {
  usePageMeta("Settings");
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ settings: S }>("/api/admin/settings").then((d) => setS(d.settings)).catch((e) => setMsg({ ok: false, text: errText(e) }));
  }, []);

  if (!s) return msg ? <Notice msg={msg} /> : <p role="status">Loading…</p>;
  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/admin/settings", { method: "PUT", body: s });
      setMsg({ ok: true, text: "Saved. The website shows these details from the next page load." });
    } catch (err) {
      setMsg({ ok: false, text: errText(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="text-4xl">Business settings</h1>
      <p className="mt-2 max-w-xl text-sm text-royal/75">These appear in the website header, footer, Contact page and WhatsApp buttons.</p>
      <form onSubmit={save} className="mt-8 max-w-2xl space-y-5" noValidate>
        <FormField label="WhatsApp number" inputMode="tel" value={s.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} hint="With country code, e.g. 2348012345678. This powers every WhatsApp button." />
        <FormField label="Phone number" inputMode="tel" value={s.phone} onChange={(e) => set("phone", e.target.value)} />
        <FormField label="Email" type="email" value={s.email} onChange={(e) => set("email", e.target.value)} />
        <FormField label="Instagram link" inputMode="url" value={s.instagram} onChange={(e) => set("instagram", e.target.value)} hint="Full link starting with https://" />
        <FormField label="TikTok link" inputMode="url" value={s.tiktok} onChange={(e) => set("tiktok", e.target.value)} />
        <FormField label="Facebook link" inputMode="url" value={s.facebook} onChange={(e) => set("facebook", e.target.value)} />
        <FormField label="Address" value={s.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />
        <FormField label="Opening hours" value={s.openingHours} onChange={(e) => set("openingHours", e.target.value)} maxLength={120} hint="For example: Mon to Sat, 10am to 6pm" />
        <FormField label="Announcement bar text" value={s.announcement} onChange={(e) => set("announcement", e.target.value)} maxLength={160} hint="Shown in the blue strip at the top of every page. Leave empty to hide the words." />
        <CheckField label="Show a “demo preview” notice at the top of the site" checked={s.demoMode} onChange={(e) => set("demoMode", e.target.checked)} />
        <div className="flex items-center gap-4">
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
          <Notice msg={msg} />
        </div>
      </form>
    </>
  );
}
