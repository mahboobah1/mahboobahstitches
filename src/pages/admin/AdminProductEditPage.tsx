import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ImageManager, type Img } from "../../components/admin/ImageManager";
import { CheckField, Notice, SelectField, TextAreaField, errText, type Msg } from "../../components/admin/kit";
import { StockControl } from "../../components/admin/StockControl";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { formatMoney, fromMinor, fulfilmentLabel, toMinor } from "../../lib/format";
import { usePageMeta } from "../../lib/usePageMeta";

interface Col { id: string; name: string }
interface Cat { id: string; collectionId: string; name: string }
interface VariantRow {
  id: string; sku: string; size: string; colour: string; priceMinor: number; currency: string; isActive: number;
  trackStock: number; onHand: number; reserved: number; allowBackorder: number;
}
interface ProductForm {
  name: string; slug: string; description: string; collectionId: string; categoryId: string; type: string; status: string;
  isNew: boolean; isBestseller: boolean; fulfilmentInfo: string; shippingInfo: string;
}
const empty: ProductForm = { name: "", slug: "", description: "", collectionId: "", categoryId: "", type: "ready_to_wear", status: "draft", isNew: false, isBestseller: false, fulfilmentInfo: "", shippingInfo: "" };

export default function AdminProductEditPage() {
  const { id = "new" } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  usePageMeta(isNew ? "New product" : "Edit product");
  const [form, setForm] = useState<ProductForm>(empty);
  const [cols, setCols] = useState<Col[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [images, setImages] = useState<Img[]>([]);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await api<{ collections: Col[]; categories: Cat[] }>("/api/admin/collections");
      setCols(c.collections);
      setCats(c.categories);
      if (isNew) {
        setForm((f) => ({ ...f, collectionId: f.collectionId || c.collections[0]?.id || "" }));
      } else {
        const d = await api<{ product: Record<string, unknown>; variants: VariantRow[]; images: Img[] }>(`/api/admin/products/${id}`);
        const p = d.product;
        setForm({
          name: String(p.name), slug: String(p.slug), description: String(p.description ?? ""), collectionId: String(p.collectionId),
          categoryId: String(p.categoryId ?? ""), type: String(p.type), status: String(p.status), isNew: p.isNew === 1,
          isBestseller: p.isBestseller === 1, fulfilmentInfo: String(p.fulfilmentInfo ?? ""), shippingInfo: String(p.shippingInfo ?? ""),
        });
        setVariants(d.variants);
        setImages(d.images);
      }
      setLoaded(true);
    } catch (e) {
      setMsg({ ok: false, text: errText(e) });
    }
  }, [id, isNew]);

  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const body = { ...form, categoryId: form.categoryId || null, slug: form.slug.trim() || undefined };
    try {
      if (isNew) {
        const r = await api<{ id: string }>("/api/admin/products", { method: "POST", body });
        navigate(`/admin/products/${r.id}`, { replace: true });
      } else {
        await api(`/api/admin/products/${id}`, { method: "PUT", body });
        setMsg({ ok: true, text: form.status === "active" ? "Saved. This product is live on the shop." : "Saved." });
        void load();
      }
    } catch (err) {
      setMsg({ ok: false, text: errText(err) });
    } finally {
      setBusy(false);
    }
  };

  if (!loaded && !msg) return <p role="status">Loading…</p>;
  const catOptions = cats.filter((c) => c.collectionId === form.collectionId);

  return (
    <>
      <Link to="/admin/products" className="link-line text-sm">← All products</Link>
      <h1 className="mt-2 text-4xl">{isNew ? "New product" : form.name || "Edit product"}</h1>

      <form onSubmit={save} className="mt-8 max-w-2xl space-y-5" noValidate>
        <FormField label="Product name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required />
        <FormField label="Web address (optional)" value={form.slug} onChange={(e) => set("slug", e.target.value)} hint="Leave empty to create it from the name. Letters, numbers and hyphens only." />
        <TextAreaField label="Description" value={form.description} maxLength={4000} onChange={(e) => set("description", e.target.value)} hint="Fabric, fit, care. Write only what is true." />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField label="Collection" value={form.collectionId} onChange={(e) => setForm((f) => ({ ...f, collectionId: e.target.value, categoryId: "" }))}>
            {cols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <SelectField label="Category" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">None</option>
            {catOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          <SelectField label="How it is supplied" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {Object.entries(fulfilmentLabel).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </SelectField>
          <SelectField label="Status" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="draft">Draft (hidden)</option>
            <option value="active">Live on the shop</option>
            <option value="archived">Archived (hidden)</option>
          </SelectField>
        </div>
        <TextAreaField label="Production information" value={form.fulfilmentInfo} maxLength={1000} onChange={(e) => set("fulfilmentInfo", e.target.value)} hint="For example how long made-to-order pieces take." />
        <TextAreaField label="Shipping information" value={form.shippingInfo} maxLength={1000} onChange={(e) => set("shippingInfo", e.target.value)} />
        <div className="flex flex-wrap gap-x-8">
          <CheckField label="Show as a new arrival" checked={form.isNew} onChange={(e) => set("isNew", e.target.checked)} />
          <CheckField label="Show as a bestseller" checked={form.isBestseller} onChange={(e) => set("isBestseller", e.target.checked)} />
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : isNew ? "Create product" : "Save changes"}</button>
          <Notice msg={msg} />
        </div>
        {form.status === "active" && variants.length === 0 && !isNew && (
          <p className="text-sm text-royal/75">A live product only appears on the shop once it has at least one option (size or colour) below.</p>
        )}
      </form>

      {!isNew && (
        <>
          <section className="mt-14" aria-labelledby="variants-h">
            <h2 id="variants-h">Sizes, colours, prices and stock</h2>
            <p className="mt-2 max-w-xl text-sm text-royal/75">Each combination is one option with its own price, SKU and stock. Leave size or colour empty if a product has only one. A price of 0 shows on the website as “Price on request”: customers are sent to WhatsApp and cannot add it to the cart.</p>
            <ul className="mt-6 space-y-5">
              {variants.map((v) => <VariantCard key={v.id} v={v} onSaved={load} />)}
            </ul>
            <AddVariant productId={id} onAdded={load} />
          </section>
          <section className="mt-14" aria-labelledby="photos-h">
            <h2 id="photos-h">Photos</h2>
            <div className="mt-4"><ImageManager productId={id} productName={form.name} images={images} onChanged={load} /></div>
          </section>
        </>
      )}
    </>
  );
}

function VariantCard({ v, onSaved }: { v: VariantRow; onSaved: () => void }) {
  const [sku, setSku] = useState(v.sku);
  const [size, setSize] = useState(v.size);
  const [colour, setColour] = useState(v.colour);
  const [price, setPrice] = useState(fromMinor(v.priceMinor));
  const [active, setActive] = useState(v.isActive === 1);
  const [track, setTrack] = useState(v.trackStock === 1);
  const [backorder, setBackorder] = useState(v.allowBackorder === 1);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const minor = toMinor(price);
    if (minor === null) { setMsg({ ok: false, text: "Enter the price as a number, e.g. 25000." }); return; }
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/variants/${v.id}`, { method: "PUT", body: { sku, size, colour, priceMinor: minor, isActive: active, trackStock: track, allowBackorder: backorder } });
      setMsg({ ok: true, text: "Saved." });
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: errText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="border border-dashed border-gold p-4">
      <p className="font-medium">{[v.size, v.colour].filter(Boolean).join(" · ") || "Standard"} <span className="font-normal text-royal/70">({formatMoney(v.priceMinor, v.currency)})</span></p>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <FormField label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
        <FormField label="Size" value={size} onChange={(e) => setSize(e.target.value)} />
        <FormField label="Colour" value={colour} onChange={(e) => setColour(e.target.value)} />
        <FormField label="Price (₦)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-8">
        <CheckField label="Available to sell" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <CheckField label="Count stock" checked={track} onChange={(e) => setTrack(e.target.checked)} />
        <CheckField label="Allow orders when out of stock" checked={backorder} onChange={(e) => setBackorder(e.target.checked)} />
      </div>
      <div className="mt-2 flex items-center gap-4">
        <button type="button" className="btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save option"}</button>
        <Notice msg={msg} />
      </div>
      <StockControl variantId={v.id} onHand={v.onHand} reserved={v.reserved} tracked={v.trackStock === 1} onChanged={() => onSaved()} />
    </li>
  );
}

function AddVariant({ productId, onAdded }: { productId: string; onAdded: () => void }) {
  const [f, setF] = useState({ sku: "", size: "", colour: "", price: "", stock: "0", track: true });
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const minor = toMinor(f.price);
    const stock = Number(f.stock);
    if (minor === null) { setMsg({ ok: false, text: "Enter the price as a number, e.g. 25000." }); return; }
    if (!Number.isInteger(stock) || stock < 0) { setMsg({ ok: false, text: "Opening stock must be a whole number." }); return; }
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/products/${productId}/variants`, { method: "POST", body: { sku: f.sku, size: f.size, colour: f.colour, priceMinor: minor, trackStock: f.track, onHand: stock } });
      setF({ sku: "", size: "", colour: "", price: f.price, stock: "0", track: f.track });
      setMsg({ ok: true, text: "Option added." });
      onAdded();
    } catch (e) {
      setMsg({ ok: false, text: errText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 max-w-2xl border border-gold p-4">
      <h3>Add an option</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FormField label="SKU (your own code)" value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} hint="Unique, e.g. JIL-1-M-NAVY" />
        <FormField label="Price (₦)" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <FormField label="Size" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} />
        <FormField label="Colour" value={f.colour} onChange={(e) => setF({ ...f, colour: e.target.value })} />
        <FormField label="Opening stock" type="number" inputMode="numeric" min={0} value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} />
        <CheckField label="Count stock (untick for made to order)" checked={f.track} onChange={(e) => setF({ ...f, track: e.target.checked })} />
      </div>
      <div className="mt-3 flex items-center gap-4">
        <button type="button" className="btn-primary" onClick={add} disabled={busy}>{busy ? "Adding…" : "Add option"}</button>
        <Notice msg={msg} />
      </div>
    </div>
  );
}
