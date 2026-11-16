import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckField, Notice, SelectField, TextAreaField, errText, type Msg } from "../../components/admin/kit";
import { FormField } from "../../components/FormField";
import { RichText } from "../../components/RichText";
import { api } from "../../lib/api";
import { usePageMeta } from "../../lib/usePageMeta";

const titles: Record<string, string> = { about: "About us", faq: "Frequently asked questions", policies: "Policies" };

export default function AdminPageEditPage() {
  const { id = "new" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isNew = id === "new";
  usePageMeta(isNew ? "New page" : "Edit page");
  const presetSlug = params.get("slug") ?? "";
  const [title, setTitle] = useState(titles[presetSlug] ?? "");
  const [slug, setSlug] = useState(presetSlug);
  const [kind, setKind] = useState(presetSlug === "faq" ? "faq" : presetSlug === "policies" ? "policy" : "page");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(false);
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (isNew) return;
    api<{ page: { title: string; slug: string; kind: string; body: string; isPublished: number } }>(`/api/admin/pages/${id}`)
      .then(({ page }) => { setTitle(page.title); setSlug(page.slug); setKind(page.kind); setBody(page.body); setPublished(page.isPublished === 1); setLoaded(true); })
      .catch((e) => setMsg({ ok: false, text: errText(e) }));
  }, [id, isNew]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const payload = { title, slug: slug.trim() || undefined, kind, body, isPublished: published };
    try {
      if (isNew) {
        const r = await api<{ id: string }>("/api/admin/pages", { method: "POST", body: payload });
        navigate(`/admin/content/${r.id}`, { replace: true });
      } else {
        await api(`/api/admin/pages/${id}`, { method: "PUT", body: payload });
        setMsg({ ok: true, text: published ? "Saved and published." : "Saved as a draft." });
      }
    } catch (err) {
      setMsg({ ok: false, text: errText(err) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Delete this page for good?")) return;
    try { await api(`/api/admin/pages/${id}`, { method: "DELETE" }); navigate("/admin/content", { replace: true }); }
    catch (err) { setMsg({ ok: false, text: errText(err) }); }
  };

  if (!loaded && !msg) return <p role="status">Loading…</p>;
  const publicPath = kind === "journal" ? `/journal/${slug}` : `/${slug}`;

  return (
    <>
      <Link to="/admin/content" className="link-line text-sm">← All pages</Link>
      <h1 className="mt-2 text-4xl">{isNew ? "New page" : title || "Edit page"}</h1>
      <form onSubmit={save} className="mt-8 max-w-2xl space-y-5" noValidate>
        <FormField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Web address" value={slug} onChange={(e) => setSlug(e.target.value)} hint="Use about, faq or policies for those pages. Leave empty to create from the title." />
          <SelectField label="Type" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="page">Page</option>
            <option value="journal">Journal post</option>
            <option value="faq">FAQ</option>
            <option value="policy">Policy</option>
          </SelectField>
        </div>
        <TextAreaField label="Text" value={body} onChange={(e) => setBody(e.target.value)} rows={14}
          hint="Leave a blank line between paragraphs. Start a line with ## for a heading, ### for a smaller heading, or - for a bullet list." />
        <button type="button" className="link-line text-sm" onClick={() => setPreview((p) => !p)}>{preview ? "Hide preview" : "Show preview"}</button>
        {preview && <div className="border border-dashed border-gold p-4"><RichText text={body || "Nothing written yet."} /></div>}
        <CheckField label="Published (visible on the website)" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          {!isNew && <button type="button" className="btn-ghost" onClick={remove}>Delete</button>}
          <Notice msg={msg} />
        </div>
        {!isNew && published && <p className="text-sm">Live at <Link className="link-line" to={publicPath}>{publicPath}</Link></p>}
      </form>
    </>
  );
}
