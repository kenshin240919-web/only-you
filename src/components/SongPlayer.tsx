"use client";

import { useRef, useState } from "react";

function fmt(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** 완성된 노래 플레이어. src가 없으면 아직 준비 중인 상태로 보여 준다. */
export default function SongPlayer({ title, subtitle, src, note }: { title: string; subtitle: string; src: string | null; note?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [sec, setSec] = useState(0);
  const [length, setLength] = useState(0);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current;
    if (!a || !length) return;
    const box = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - box.left) / box.width) * length;
  };

  return (
    <div className="player">
      <div className="cover">{title}</div>
      <p className="muted" style={{ margin: 0 }}>
        {subtitle}
      </p>
      {src && (
        <audio
          ref={audio}
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
          onTimeUpdate={(e) => setSec(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div className="progress" onClick={seek} style={{ cursor: src ? "pointer" : "default" }}>
          <span style={{ width: `${length ? (sec / length) * 100 : 0}%` }} />
        </div>
        <div className="time-row">
          <span>{fmt(sec)}</span>
          <span>{fmt(length)}</span>
        </div>
      </div>
      <button
        type="button"
        className="play-btn"
        style={{ width: 64, height: 64, fontSize: 22 }}
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? "일시정지" : "재생"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      {note && <small className="muted">{note}</small>}
    </div>
  );
}
