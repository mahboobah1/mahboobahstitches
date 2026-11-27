import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { FormError, FormField } from "./FormField";
import { TextAreaField } from "./admin/kit";

export const Stars = ({ n }: { n: number }) => <span aria-label={`${n} out of 5 stars`} className="text-gold-deep">{"★".repeat(Math.round(n))}<span className="text-royal/25">{"★".repeat(5 - Math.round(n))}</span></span>;

interface Data { summary: { count: number; average: number | null }; reviews: { rating: number; title: string | null; body: string; at: number; author: string }[]; canReview: boolean; mine: string | null }

/** Reviews come only from customers who bought the product, and appear after the shop approves them. */
export function Reviews({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [d, setD] = useState<Data | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api<Data>(`/api/products/${slug}/reviews`).then(setD).catch(() => undefined); }, [slug]);
  useEffect(load, [load, user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await api("/api/reviews", { method: "POST", body: { productSlug: slug, rating, title: title || undefined, body } }); setMsg("Thank you! Your review will appear once we have approved it."); setBody(""); setTitle(""); load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not send your review."); } finally { setBusy(false); }
  };
  if (!d) return null;
  return (
    <section className="mt-16" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Customer reviews</h2>
      {d.summary.count > 0 && d.summary.average !== null ? <p className="mt-2"><Stars n={d.summary.average} /> <span className="text-sm text-royal/75">{d.summary.average} from {d.summary.count} {d.summary.count === 1 ? "review" : "reviews"}</span></p> : <p className="mt-2 text-sm text-royal/70">No reviews yet.</p>}
      <ul className="mt-5 space-y-5">
        {d.reviews.map((r, i) => <li key={i} className="border-b border-dashed border-gold/60 pb-4"><Stars n={r.rating} /> {r.title && <strong className="ml-2">{r.title}</strong>}<p className="mt-1 text-sm">{r.body}</p><p className="mt-1 text-xs text-royal/60">{r.author} · verified purchase · {new Date(r.at * 1000).toLocaleDateString()}</p></li>)}
      </ul>
      {d.mine && d.mine !== "approved" && <p className="mt-4 text-sm" role="status">Your review is {d.mine === "pending" ? "waiting for approval" : d.mine}.</p>}
      {msg && <p className="mt-4 text-sm" role="status">{msg}</p>}
      {!user && <p className="mt-4 text-sm text-royal/75"><Link className="link-line" to={`/account/login?next=${encodeURIComponent(window.location.pathname)}`}>Sign in</Link> to review a product you bought.</p>}
      {d.canReview && (
        <form onSubmit={submit} className="mt-6 max-w-lg space-y-4" noValidate>
          <h3 className="!text-xl">Write a review</h3>
          <fieldset><legend className="mb-1 text-sm">Your rating</legend><div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)} className={`h-11 w-11 border text-xl ${rating >= n ? "border-gold bg-gold/20 text-gold-deep" : "border-royal/30 text-royal/40"}`}>★</button>)}</div></fieldset>
          <FormField label="Title (optional)" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          <TextAreaField label="Your review" value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} />
          <FormError message={error} />
          <button type="submit" className="btn-primary" disabled={busy || body.trim().length < 10}>{busy ? "Sending…" : "Send review"}</button>
        </form>
      )}
    </section>
  );
}
