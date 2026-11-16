import { useRef, useState } from "react";
import { api } from "../../lib/api";
import { FormField } from "../FormField";
import { Notice, errText, type Msg } from "./kit";

export interface Img {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
}

/** Shrinks a photo on the phone (longest side 1400px, JPEG) so uploads are small and fast. */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  let w = Math.round(bitmap.width * scale);
  let h = Math.round(bitmap.height * scale);
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot prepare images.");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const quality = Math.max(0.5, 0.82 - attempt * 0.08);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (blob && blob.size <= 560_000) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return btoa(bin);
    }
    w = Math.round(w * 0.85);
    h = Math.round(h * 0.85);
  }
  throw new Error("That photo is too large even after shrinking. Try a different one.");
}

export function ImageManager({ productId, productName, images, onChanged }: { productId: string; productName: string; images: Img[]; onChanged: () => void }) {
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const dataBase64 = await shrink(file);
      const media = await api<{ id: string }>("/api/admin/media", { method: "POST", body: { mime: "image/jpeg", dataBase64 } });
      await api(`/api/admin/products/${productId}/images`, { method: "POST", body: { mediaId: media.id, alt: alt.trim() || `${productName} photo ${images.length + 1}` } });
      setAlt("");
      setMsg({ ok: true, text: "Photo added." });
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: errText(e, "Upload failed.") });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const ids = images.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    try {
      await api(`/api/admin/products/${productId}/image-order`, { method: "PUT", body: { ids } });
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: errText(e) });
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this photo?")) return;
    try {
      await api(`/api/admin/images/${id}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      setMsg({ ok: false, text: errText(e) });
    }
  };

  const saveAlt = async (id: string, value: string) => {
    try {
      await api(`/api/admin/images/${id}`, { method: "PUT", body: { alt: value } });
      setMsg({ ok: true, text: "Description saved." });
    } catch (e) {
      setMsg({ ok: false, text: errText(e) });
    }
  };

  return (
    <div>
      <p className="text-sm text-royal/75">The first photo is the main one. Describe each photo in a few words (used by screen readers and Google).</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {images.map((im, i) => (
          <li key={im.id} className="border border-dashed border-gold p-3">
            <img src={im.url} alt={im.alt} className="aspect-[4/5] w-full bg-powder object-cover" />
            <input defaultValue={im.alt} aria-label="Photo description" maxLength={160} className="field mt-2" onBlur={(e) => e.target.value !== im.alt && saveAlt(im.id, e.target.value)} />
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn-ghost !px-3" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier">↑</button>
              <button type="button" className="btn-ghost !px-3" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Move later">↓</button>
              <button type="button" className="btn-ghost ml-auto" onClick={() => remove(im.id)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      {images.length === 0 && <p className="mt-4 text-sm">No photos yet.</p>}
      <div className="mt-5 max-w-md space-y-3">
        <FormField label="Description of the next photo" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={160} hint='For example: "Navy one-piece jilbab, front view".' />
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" id="photo-input" onChange={(e) => upload(e.target.files?.[0])} />
        <label htmlFor="photo-input" className={`btn-primary cursor-pointer ${busy ? "opacity-60" : ""}`}>{busy ? "Uploading…" : "Choose a photo"}</label>
        <Notice msg={msg} />
      </div>
    </div>
  );
}
