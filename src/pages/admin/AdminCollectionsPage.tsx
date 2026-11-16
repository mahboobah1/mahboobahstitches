import { useCallback, useEffect, useState } from "react";
import { CheckField, Notice, errText, type Msg } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { api } from "../../lib/api";
import { usePageMeta } from "../../lib/usePageMeta";

interface Col { id: string; slug: string; name: string; blurb: string | null; sortOrder: number; isActive: number }
interface Cat { id: string; collectionId: string; name: string; sortOrder: number }

export default function AdminCollectionsPage() {
  usePageMeta("Collections");
  const [cols, setCols] = useState<Col[] | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);

  const load = useCallback(() => {
    api<{ collections: Col[]; categories: Cat[] }>("/api/admin/collections")
      .then((d) => { setCols(d.collections); setCats(d.categories); })
      .catch((e) => setError(errText(e)));
  }, []);
  useEffect(load, [load]);

  const create = async () => {
    setMsg(null);
    try {
      await api("/api/admin/collections", { method: "POST", body: { name: newName } });
      setNewName("");
      setMsg({ ok: true, text: "Collection created." });
      load();
    } catch (e) { setMsg({ ok: false, text: errText(e) }); }
  };

  return (
    <>
      <h1 className="text-4xl">Collections and categories</h1>
      <p className="mt-2 max-w-xl text-sm text-royal/75">Collections are the main groups on your shop. Categories sit inside them. Hide a collection to remove it from the shop without deleting anything.</p>
      {error && <p role="alert" className="mt-4 text-[#9b2c2c]">{error}</p>}
      {!cols && !error && <p className="mt-6" role="status">Loading…</p>}
      <ul className="mt-8 space-y-8">
        {cols?.map((c) => <CollectionCard key={c.id} col={c} cats={cats.filter((x) => x.collectionId === c.id)} onChanged={load} />)}
      </ul>
      <div className="mt-10 max-w-md border border-gold p-4">
        <h2 className="!text-2xl">Add a collection</h2>
        <div className="mt-3"><FormField label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} /></div>
        <div className="mt-3 flex items-center gap-4">
          <button type="button" className="btn-primary" onClick={create} disabled={newName.trim().length < 2}>Add</button>
          <Notice msg={msg} />
        </div>
      </div>
    </>
  );
}

function CollectionCard({ col, cats, onChanged }: { col: Col; cats: Cat[]; onChanged: () => void }) {
  const [name, setName] = useState(col.name);
  const [blurb, setBlurb] = useState(col.blurb ?? "");
  const [order, setOrder] = useState(String(col.sortOrder));
  const [active, setActive] = useState(col.isActive === 1);
  const [newCat, setNewCat] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);

  const save = async () => {
    setMsg(null);
    try {
      await api(`/api/admin/collections/${col.id}`, { method: "PUT", body: { name, blurb, sortOrder: Number(order), isActive: active } });
      setMsg({ ok: true, text: "Saved." });
      onChanged();
    } catch (e) { setMsg({ ok: false, text: errText(e) }); }
  };
  const addCat = async () => {
    setMsg(null);
    try {
      await api("/api/admin/categories", { method: "POST", body: { collectionId: col.id, name: newCat } });
      setNewCat("");
      onChanged();
    } catch (e) { setMsg({ ok: false, text: errText(e) }); }
  };

  return (
    <li className="border border-dashed border-gold p-4">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <FormField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <FormField label="Order on shop" type="number" inputMode="numeric" min={0} value={order} onChange={(e) => setOrder(e.target.value)} />
      </div>
      <div className="mt-3"><FormField label="Short description" value={blurb} onChange={(e) => setBlurb(e.target.value)} maxLength={300} /></div>
      <CheckField label="Show on the shop" checked={active} onChange={(e) => setActive(e.target.checked)} />
      <div className="flex items-center gap-4">
        <button type="button" className="btn-primary" onClick={save}>Save collection</button>
        <Notice msg={msg} />
      </div>
      <div className="mt-5 border-t border-dashed border-gold/60 pt-4">
        <p className="text-sm font-medium">Categories</p>
        <ul className="mt-2 space-y-2">
          {cats.map((k) => <CategoryRow key={k.id} cat={k} onChanged={onChanged} />)}
        </ul>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1"><FormField label="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} maxLength={80} /></div>
          <button type="button" className="btn-ghost" onClick={addCat} disabled={newCat.trim().length < 2}>Add</button>
        </div>
      </div>
    </li>
  );
}

function CategoryRow({ cat, onChanged }: { cat: Cat; onChanged: () => void }) {
  const [name, setName] = useState(cat.name);
  const [err, setErr] = useState("");
  const rename = async () => {
    if (name === cat.name) return;
    setErr("");
    try { await api(`/api/admin/categories/${cat.id}`, { method: "PUT", body: { name, sortOrder: cat.sortOrder } }); onChanged(); }
    catch (e) { setErr(errText(e)); }
  };
  const remove = async () => {
    if (!window.confirm(`Delete the category “${cat.name}”?`)) return;
    setErr("");
    try { await api(`/api/admin/categories/${cat.id}`, { method: "DELETE" }); onChanged(); }
    catch (e) { setErr(errText(e)); }
  };
  return (
    <li>
      <div className="flex gap-2">
        <input className="field" value={name} aria-label="Category name" maxLength={80} onChange={(e) => setName(e.target.value)} onBlur={rename} />
        <button type="button" className="btn-ghost" onClick={remove}>Delete</button>
      </div>
      {err && <p role="alert" className="mt-1 text-sm text-[#9b2c2c]">{err}</p>}
    </li>
  );
}
