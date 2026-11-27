import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Stars } from "../Reviews";

interface R { rating: number; title: string | null; body: string; author: string; product: string }

/** Real, approved customer reviews only. The section stays hidden until there are some. */
export function Testimonials() {
  const [rows, setRows] = useState<R[]>([]);
  useEffect(() => { api<{ reviews: R[] }>("/api/reviews/featured").then((d) => setRows(d.reviews.slice(0, 3))).catch(() => undefined); }, []);
  if (rows.length === 0) return null;
  return (
    <section className="section" aria-labelledby="reviews-home">
      <div className="wrap">
        <h2 id="reviews-home">What customers say</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {rows.map((r, i) => (
            <figure key={i}><Stars n={r.rating} /><blockquote className="mt-2 font-display text-2xl leading-snug">{r.body.length > 180 ? r.body.slice(0, 177) + "…" : r.body}</blockquote><figcaption className="mt-3 text-sm text-royal/75">{r.author} · {r.product}</figcaption></figure>
          ))}
        </div>
      </div>
    </section>
  );
}
