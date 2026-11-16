import type { ReactNode } from "react";

/**
 * Renders the simple formatting used in the content editor. Output is built from React elements and
 * text only (never raw HTML), so pasted text cannot inject scripts.
 *   ## Heading     ### Smaller heading     - list item     blank line = new paragraph
 */
export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const out: ReactNode[] = [];
  blocks.forEach((block, i) => {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) return;
    if (lines.every((l) => l.startsWith("- "))) {
      out.push(<ul key={i} className="list-disc space-y-1 pl-6">{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>);
    } else if (lines[0].startsWith("### ")) {
      out.push(<h3 key={i} className="mt-2">{lines[0].slice(4)}</h3>);
    } else if (lines[0].startsWith("## ")) {
      out.push(<h2 key={i} className="mt-4 !text-2xl sm:!text-3xl">{lines[0].slice(3)}</h2>);
    } else {
      out.push(<p key={i} className="whitespace-pre-line">{lines.join("\n")}</p>);
    }
  });
  return <div className="space-y-4 text-royal/90">{out}</div>;
}
