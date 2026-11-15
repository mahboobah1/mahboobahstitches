import { reviews } from "../../data/reviews";

/** Hidden until genuine reviews exist (see src/data/reviews.ts). */
export function Testimonials() {
  if (reviews.length === 0) return null;
  return (
    <section className="section" aria-labelledby="reviews-title">
      <div className="wrap">
        <h2 id="reviews-title">What customers say</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {reviews.map((r) => (
            <figure key={r.id}>
              <blockquote className="font-display text-2xl leading-snug">{r.text}</blockquote>
              <figcaption className="mt-3 text-sm text-royal/75">{r.author}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
