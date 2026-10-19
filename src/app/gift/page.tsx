"use client";

import Link from "next/link";
import { useState } from "react";
import EmptyState from "@/components/EmptyState";
import LyricsSheet from "@/components/LyricsSheet";
import MockPlayer from "@/components/MockPlayer";
import { useOrder } from "@/components/useOrder";
import { callName, genreLabel } from "@/lib/draft";

export default function GiftPage() {
  const [order] = useOrder();
  const [opened, setOpened] = useState(false);

  if (!order) return null;
  if (!order.paidAt || !order.lyrics) {
    return <EmptyState title="선물을 찾을 수 없어요" desc="링크가 꺼졌거나 만료되었을 수 있어요." href="/" cta="Only You 둘러보기" />;
  }

  const d = order.draft;
  const n = callName(d);

  if (!opened) {
    return (
      <div className="container gift-page">
        <div style={{ textAlign: "center" }}>
          <p className="muted">누군가 당신을 위해 노래를 만들었어요</p>
          <h1 style={{ fontSize: 28, margin: "0 0 28px" }}>{n}에게 온 선물</h1>
          <button type="button" className="envelope" onClick={() => setOpened(true)} aria-label="선물 열기">
            <span className="seal" aria-hidden>
              ♪
            </span>
            <span className="envelope-label">눌러서 열어 보세요</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container narrow fade-in" style={{ padding: "32px 16px 40px" }}>
      {d.message.trim() && (
        <div className="card" style={{ textAlign: "center", fontFamily: "var(--serif)", fontSize: 19, marginBottom: 16 }}>
          “{d.message.trim()}”
        </div>
      )}
      <div className="card">
        <MockPlayer title={order.lyrics.title} subtitle={`${n}만을 위한 ${genreLabel(d)}`} />
      </div>
      <div style={{ marginTop: 16 }}>
        <LyricsSheet lyrics={order.lyrics} />
      </div>
      <div className="card" style={{ marginTop: 24, textAlign: "center" }}>
        <p style={{ margin: "0 0 12px" }}>나도 소중한 사람에게 노래를 선물하고 싶다면</p>
        <Link href="/" className="btn">
          Only You 둘러보기
        </Link>
      </div>
    </div>
  );
}
