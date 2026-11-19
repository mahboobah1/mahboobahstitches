import { useEffect, useState, type FormEvent } from "react";
import { CheckField, Notice, errText, type Msg } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { PictureField } from "../../components/admin/ImagePicker";
import { api } from "../../lib/api";
import { formatMoney, fromMinor, toMinor } from "../../lib/format";
import { usePageMeta } from "../../lib/usePageMeta";

type S = {
  whatsappNumber: string; phone: string; email: string; instagram: string; tiktok: string; facebook: string;
  address: string; openingHours: string; announcement: string; demoMode: boolean; heroImage: string; bespokeImage: string; deliveryFeeMinor: number; deliveryNote: string;
};

export default function AdminSettingsPage() {
  usePageMeta("Settings");
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const [fee, setFee] = useState("");

  useEffect(() => {
    api<{ settings: S }>("/api/admin/settings").then((d) => { setS(d.settings); setFee(fromMinor(d.settings.deliveryFeeMinor)); }).catch((e) => setMsg({ ok: false, text: errText(e) }));
  }, []);

  if (!s) return msg ? <Notice msg={msg} /> : <p role="status">Loading…</p>;
  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const feeMinor = fee.trim() ? toMinor(fee) : 0;
      if (feeMinor === null) { setMsg({ ok: false, text: "Enter the delivery fee as a number, e.g. 2500." }); setBusy(false); return; }
      await api("/api/admin/settings", { method: "PUT", body: { ...s, deliveryFeeMinor: feeMinor } });
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
        <h2 className="!text-2xl">Homepage pictures</h2>
        <PictureField label="Main picture at the top of the homepage" value={s.heroImage} onChange={(u) => set("heroImage", u)} />
        <PictureField label="Picture beside the custom-orders section" value={s.bespokeImage} onChange={(u) => set("bespokeImage", u)} />
        <h2 className="!text-2xl pt-4">Delivery at checkout</h2>
        <FormField label="Delivery fee (₦)" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} hint={`One fee for every online order for now (${formatMoney(toMinor(fee || "0") ?? 0)}). Leave 0 and we show "Confirmed by us". Delivery zones come later.`} />
        <FormField label="Delivery note shown at checkout" value={s.deliveryNote} maxLength={200} onChange={(e) => set("deliveryNote", e.target.value)} hint="For example: Lagos 2 to 3 working days. Other states confirmed by WhatsApp." />
        <h2 className="!text-2xl pt-4">Contact and business details</h2>
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
