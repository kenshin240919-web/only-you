"use client";

import { useEffect, useRef, useState } from "react";

type Props = { title: string; tag: string; emoji: string; color: string; lines: string[]; src: string };

// 한 번에 한 곡만 재생되도록 다른 샘플이 재생되면 멈춘다.
const PLAY_EVENT = "sample-play";

export default function SamplePlayer({ title, tag, emoji, color, lines, src }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);

  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== src) audio.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, [src]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: src }));
      void a.play();
    } else {
      a.pause();
    }
  };

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
      <audio
        ref={audio}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPos(0)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setPos((a.currentTime / a.duration) * 100);
        }}
      />
      <div className="play-row">
        <button
          type="button"
          className="play-btn"
          onClick={toggle}
          aria-label={playing ? `${title} 일시정지` : `${title} 재생`}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="progress" aria-hidden>
          <span style={{ width: `${pos}%` }} />
        </div>
      </div>
    </article>
  );
}
