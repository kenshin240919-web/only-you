import type { ReactNode } from "react";
import type { Lyrics } from "@/lib/draft";

function highlight(line: string, words: string[]): ReactNode {
  const targets = words.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!targets.length) return line;
  const escaped = targets.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = line.split(new RegExp(`(${escaped.join("|")})`));
  return parts.map((p, i) =>
    targets.includes(p) ? (
      <span key={i} className="mark">
        {p}
      </span>
    ) : (
      p
    ),
  );
}

export default function LyricsSheet({
  lyrics,
  meta,
  highlights = [],
}: {
  lyrics: Lyrics;
  meta?: string;
  highlights?: string[];
}) {
  return (
    <article className="lyrics-sheet">
      <h2 className="lyrics-title">{lyrics.title}</h2>
      {meta && <p className="lyrics-meta">{meta}</p>}
      {lyrics.sections.map((s, i) => (
        <section key={i} className="lyrics-section">
          <span className="lyrics-label">{s.label}</span>
          <p>
            {s.lines.map((l, j) => (
              <span key={j}>
                {highlight(l, highlights)}
                <br />
              </span>
            ))}
          </p>
        </section>
      ))}
    </article>
  );
}
