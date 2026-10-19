"use client";

import { useEffect, useRef, useState } from "react";
import type { Lyrics } from "@/lib/draft";

const W = 1080;
const H = 1920;
const PAD = 96;
const FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

// 반복되는 후렴은 한 번만 싣고, 남은 구절을 카드 한 장에 들어가도록 글자 크기를 줄여 맞춘다.
function cardLines(lyrics: Lyrics): { label: string; lines: string[] }[] {
  const seen = new Set<string>();
  return lyrics.sections.filter((s) => {
    const key = s.lines.join("\n");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
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

function draw(canvas: HTMLCanvasElement, lyrics: Lyrics, to: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = W;
  canvas.height = H;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fdf1ea");
  bg.addColorStop(1, "#f6dccf");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(201, 87, 63, 0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = "center";
  ctx.fillStyle = "#c9573f";
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText(`${to}에게`, W / 2, 190);
  ctx.fillStyle = "#2a211d";
  ctx.font = `800 64px ${FONT}`;
  wrap(ctx, lyrics.title, W - PAD * 2).forEach((l, i) => ctx.fillText(l, W / 2, 280 + i * 76));

  const sections = cardLines(lyrics);
  const top = 420;
  const bottom = H - 170;
  // 가장 큰 글자 크기부터 줄여 가며 모든 구절이 들어가는 크기를 찾는다.
  for (let size = 38; size >= 20; size -= 2) {
    ctx.font = `400 ${size}px ${FONT}`;
    const lineH = size * 1.55;
    const gap = size * 1.3;
    const blocks = sections.map((s) => s.lines.flatMap((l) => wrap(ctx, l, W - PAD * 2)));
    const height = blocks.reduce((h, b) => h + b.length * lineH + gap + size, 0);
    if (height <= bottom - top || size === 20) {
      let y = top + Math.max(0, (bottom - top - height) / 2);
      blocks.forEach((block, i) => {
        ctx.fillStyle = "#c9573f";
        ctx.font = `700 ${Math.round(size * 0.6)}px ${FONT}`;
        ctx.fillText(sections[i].label, W / 2, y + size * 0.6);
        y += size;
        ctx.fillStyle = "#3d302a";
        ctx.font = `400 ${size}px ${FONT}`;
        for (const line of block) {
          y += lineH;
          if (y > bottom) return;
          ctx.fillText(line, W / 2, y);
        }
        y += gap;
      });
      break;
    }
  }

  ctx.fillStyle = "rgba(42, 33, 29, 0.55)";
  ctx.font = `600 26px ${FONT}`;
  ctx.fillText("♪ Only U song", W / 2, H - 100);
}

/** 가사 카드 미리보기와 이미지 저장. 저장은 가사 카드를 산 경우에만 보여 준다. */
export default function LyricsCard({ lyrics, to, owned }: { lyrics: Lyrics; to: string; owned: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    // 웹폰트가 준비된 뒤에 그려야 글꼴이 바뀌지 않는다.
    void document.fonts.ready.then(() => {
      draw(canvas, lyrics, to);
      if (owned) setUrl(canvas.toDataURL("image/png"));
    });
  }, [lyrics, to, owned]);

  return (
    <div className="lyrics-card">
      <canvas ref={ref} className={owned ? "" : "locked"} aria-label={`${lyrics.title} 가사 카드`} />
      {owned && url && (
        <a className="btn btn-block" href={url} download={`${lyrics.title} 가사 카드.png`}>
          가사 카드 이미지 저장
        </a>
      )}
    </div>
  );
}
