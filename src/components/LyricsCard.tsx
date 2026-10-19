"use client";

import qrcode from "qrcode-generator";
import { useEffect, useRef, useState } from "react";
import type { Lyrics } from "@/lib/draft";

const W = 1080;
const H = 1920;
const FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const SERIF = '"Nanum Myeongjo", "AppleMyungjo", "Noto Serif KR", serif';

type Ctx = CanvasRenderingContext2D;
type Theme = { label: string; swatch: string; ink: string; body: string; accent: string; frame: string; paint: (ctx: Ctx) => void };

// 매번 같은 그림이 나오도록 고정된 씨앗값으로 만드는 난수.
function random(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

function blobs(ctx: Ctx, list: [number, number, number, string][]) {
  for (const [x, y, r, c] of list) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function leaf(ctx: Ctx, x: number, y: number, s: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.strokeStyle = "rgba(95,127,99,.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(80, -20, 200, 0);
  ctx.stroke();
  ctx.fillStyle = "rgba(95,127,99,.28)";
  for (let i = 1; i < 7; i++) {
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(i * 28, d * 18, 22, 9, d * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export const THEMES: Record<string, Theme> = {
  watercolor: {
    label: "수채화 꽃",
    swatch: "linear-gradient(135deg, #fbf6ee, #f4b8a6)",
    ink: "#2a211d",
    body: "#4a3a33",
    accent: "#c9573f",
    frame: "rgba(201,87,63,.35)",
    paint(ctx) {
      ctx.fillStyle = "#fbf6ee";
      ctx.fillRect(0, 0, W, H);
      blobs(ctx, [
        [150, 160, 260, "rgba(240,150,130,.35)"],
        [960, 300, 220, "rgba(250,190,170,.35)"],
        [80, 1700, 300, "rgba(245,170,150,.3)"],
        [1000, 1800, 280, "rgba(240,200,160,.35)"],
        [930, 1100, 180, "rgba(250,205,190,.22)"],
        [120, 900, 160, "rgba(235,180,200,.2)"],
      ]);
      const rnd = random(3);
      for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = `rgba(120,90,70,${rnd() * 0.05})`;
        ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
      }
    },
  },
  night: {
    label: "밤하늘",
    swatch: "linear-gradient(135deg, #1b2140, #3a3160)",
    ink: "#fdf6e3",
    body: "#e9e2d0",
    accent: "#e8c27a",
    frame: "rgba(232,194,122,.5)",
    paint(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1b2140");
      g.addColorStop(1, "#3a3160");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const rnd = random(7);
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = `rgba(255,240,200,${0.25 + rnd() * 0.6})`;
        ctx.beginPath();
        ctx.arc(rnd() * W, rnd() * H, rnd() * 2.6 + 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,236,190,.9)";
      ctx.beginPath();
      ctx.arc(900, 150, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1e2444";
      ctx.beginPath();
      ctx.arc(922, 136, 44, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  sage: {
    label: "세이지 리넨",
    swatch: "linear-gradient(135deg, #e9efe4, #a9bfa6)",
    ink: "#23302a",
    body: "#3b4a42",
    accent: "#5f7f63",
    frame: "rgba(95,127,99,.45)",
    paint(ctx) {
      ctx.fillStyle = "#e9efe4";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(95,127,99,.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 6) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      leaf(ctx, 70, 1500, 1.4, -0.5);
      leaf(ctx, 1010, 260, 1.2, 2.6);
      leaf(ctx, 990, 1650, 1, 2.2);
    },
  },
};

// 반복되는 후렴은 한 번만 싣는다.
function uniqueSections(lyrics: Lyrics) {
  const seen = new Set<string>();
  return lyrics.sections.filter((s) => {
    const key = s.lines.join("\n");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function wrap(ctx: Ctx, text: string, max: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width > max && cur) {
      out.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

function drawQr(ctx: Ctx, url: string, x: number, y: number, size: number) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 4;
  const cell = size / (n + quiet * 2);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 18);
  ctx.fill();
  ctx.fillStyle = "#2a211d";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
}

type CardData = { lyrics: Lyrics; to: string; message: string; giftUrl: string };

// 맨 위에 전하는 말, 가운데 제목과 가사, 맨 아래 가운데에 선물 링크 QR. 가사는 영역에 맞춰 글자 크기를 줄인다.
function draw(canvas: HTMLCanvasElement, d: CardData, t: Theme) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;
  t.paint(ctx);
  ctx.strokeStyle = t.frame;
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.textAlign = "center";

  let y = 170;
  ctx.fillStyle = t.accent;
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(`${d.to}에게`, W / 2, y);
  if (d.message) {
    ctx.fillStyle = t.ink;
    ctx.font = `700 46px ${SERIF}`;
    const lines = wrap(ctx, `“${d.message}”`, W - 220);
    lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, W / 2, y + 80 + i * 62));
    y += 80 + (Math.min(lines.length, 3) - 1) * 62;
  }
  ctx.strokeStyle = t.frame;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 60, y + 55);
  ctx.lineTo(W / 2 + 60, y + 55);
  ctx.stroke();
  ctx.fillStyle = t.ink;
  ctx.font = `800 52px ${FONT}`;
  ctx.fillText(d.lyrics.title, W / 2, y + 140);

  const top = y + 170;
  const bottom = 1520;
  const sections = uniqueSections(d.lyrics);
  let size = 30;
  const measure = (s: number) => {
    ctx.font = `400 ${s}px ${FONT}`;
    return sections.reduce((h, sec) => h + s + sec.lines.flatMap((l) => wrap(ctx, l, W - 200)).length * s * 1.5 + s * 1.1, 0);
  };
  while (size > 16 && measure(size) > bottom - top) size -= 1;
  let ly = top + Math.max(0, (bottom - top - measure(size)) / 2);
  for (const sec of sections) {
    ctx.fillStyle = t.accent;
    ctx.font = `700 ${Math.round(size * 0.6)}px ${FONT}`;
    ctx.fillText(sec.label, W / 2, ly + size * 0.6);
    ly += size;
    ctx.fillStyle = t.body;
    ctx.font = `400 ${size}px ${FONT}`;
    for (const line of sec.lines.flatMap((l) => wrap(ctx, l, W - 200))) {
      ly += size * 1.5;
      ctx.fillText(line, W / 2, ly);
    }
    ly += size * 1.1;
  }

  drawQr(ctx, d.giftUrl, W / 2 - 115, 1560, 230);
  ctx.fillStyle = t.body;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText("휴대폰 카메라로 찍으면 이 노래를 들을 수 있어요", W / 2, 1832);
}

/** 가사 카드. 고객이 배경을 고르고 이미지로 저장한다. QR은 이 주문의 선물 링크로 연결된다. */
export default function LyricsCard({ giftEnabled, ...data }: CardData & { giftEnabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState("watercolor");
  const [url, setUrl] = useState<string | null>(null);
  const { lyrics, to, message, giftUrl } = data;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    setUrl(null);
    // 웹폰트가 준비된 뒤에 그려야 글꼴이 바뀌지 않는다.
    void Promise.all([document.fonts.load(`700 40px "Nanum Myeongjo"`), document.fonts.load(`800 40px "Pretendard Variable"`)])
      .catch(() => {})
      .then(() => {
        draw(canvas, { lyrics, to, message, giftUrl }, THEMES[theme]);
        setUrl(canvas.toDataURL("image/png"));
      });
  }, [lyrics, to, message, giftUrl, theme]);

  return (
    <div className="lyrics-card">
      <div className="theme-picker" role="radiogroup" aria-label="가사 카드 배경">
        {Object.entries(THEMES).map(([key, t]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={theme === key}
            className={theme === key ? "theme-chip selected" : "theme-chip"}
            onClick={() => setTheme(key)}
          >
            <span className="theme-swatch" style={{ background: t.swatch }} aria-hidden />
            {t.label}
          </button>
        ))}
      </div>
      <canvas ref={ref} aria-label={`${lyrics.title} 가사 카드`} />
      {url && (
        <a className="btn btn-block" href={url} download={`${lyrics.title} 가사 카드.png`}>
          가사 카드 이미지 저장
        </a>
      )}
      {!giftEnabled && (
        <small className="muted">선물 링크가 꺼져 있어서 지금은 카드의 QR 코드를 찍어도 노래가 열리지 않아요.</small>
      )}
    </div>
  );
}
