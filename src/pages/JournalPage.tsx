import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { usePageMeta } from "../lib/usePageMeta";
import ComingSoonPage from "./ComingSoonPage";
import ContentPage from "./ContentPage";
import NotFoundPage from "./NotFoundPage";

interface Post {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: number | null;
}

export function JournalPage() {
  usePageMeta("Journal", "Style notes and news from Mahboobah Stitches.");
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    api<{ posts: Post[] }>("/api/content/journal").then((d) => setPosts(d.posts)).catch(() => setPosts([]));
  }, []);

  if (posts === null) return <div className="wrap py-20 text-center" role="status">Loading…</div>;
  if (posts.length === 0) return <ComingSoonPage title="Journal" phase="soon" body="Style notes and news will appear here." />;
  return (
    <div className="wrap max-w-2xl py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">Journal</h1>
      <ul className="mt-8 divide-y divide-dashed divide-gold border-y border-dashed border-gold">
        {posts.map((p) => (
          <li key={p.slug} className="py-5">
            <Link to={`/journal/${p.slug}`} className="font-display text-2xl">{p.title}</Link>
            {p.publishedAt && <p className="text-xs text-royal/60">{new Date(p.publishedAt * 1000).toLocaleDateString()}</p>}
            <p className="mt-1 text-royal/80">{p.excerpt.replace(/[#\-]/g, "").trim()}…</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function JournalPostPage() {
  const { slug = "" } = useParams();
  return <ContentPage slug={slug} fallback={<NotFoundPage />} />;
}
