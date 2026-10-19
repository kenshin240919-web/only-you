"use client";

import { useEffect, useState } from "react";

type Props = { title: string; tag: string; emoji: string; color: string; lines: string[] };

// 시제품에서는 실제 음원이 없으므로 재생 진행만 흉내 낸다.
export default function SamplePlayer({ title, tag, emoji, color, lines }: Props) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setPos((p) => {
        if (p >= 100) {
          setPlaying(false);
          return 0;
        }
        return p + 2;
      });
    }, 250);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <article className="card sample">
      <div className="sample-cover" style={{ background: color }} aria-hidden>
        {emoji}
      </div>
      <div>
        <h3>{title}</h3>
        <span className="tag">{tag}</span>
      </div>
      <p className="muted" style={{ margin: 0, fontFamily: "var(--serif)" }}>
        {lines.map((l) => (
          <span key={l}>
            {l}
            <br />
          </span>
        ))}
      </p>
      <div className="play-row">
        <button
          type="button"
          className="play-btn"
          onClick={() => setPlaying((v) => !v)}
          aria-label={playing ? `${title} 일시정지` : `${title} 재생`}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="progress" aria-hidden>
          <span style={{ width: `${pos}%` }} />
        </div>
      </div>
      <small className="muted">시제품: 샘플 음원은 품질 시험 후 공개됩니다</small>
    </article>
  );
}
