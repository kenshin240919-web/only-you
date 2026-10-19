"use client";

import { useEffect, useState } from "react";

const LENGTH_SEC = 150;

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// 실제 음원 연결 전까지 재생 UI만 보여 주는 플레이어.
export default function MockPlayer({ title, subtitle }: { title: string; subtitle: string }) {
  const [playing, setPlaying] = useState(false);
  const [sec, setSec] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setSec((s) => {
        if (s + 1 >= LENGTH_SEC) {
          setPlaying(false);
          return 0;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <div className="player">
      <div className="cover">{title}</div>
      <p className="muted" style={{ margin: 0 }}>
        {subtitle}
      </p>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div className="progress" aria-hidden>
          <span style={{ width: `${(sec / LENGTH_SEC) * 100}%` }} />
        </div>
        <div className="time-row">
          <span>{fmt(sec)}</span>
          <span>{fmt(LENGTH_SEC)}</span>
        </div>
      </div>
      <button
        type="button"
        className="play-btn"
        style={{ width: 64, height: 64, fontSize: 22 }}
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "일시정지" : "재생"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <small className="muted">시제품: 실제 소리는 나오지 않습니다</small>
    </div>
  );
}
