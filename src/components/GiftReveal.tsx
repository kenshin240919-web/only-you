"use client";

import Link from "next/link";
import { useState } from "react";
import LyricsSheet from "@/components/LyricsSheet";
import MockPlayer from "@/components/MockPlayer";
import type { GiftView } from "@/lib/db";

export default function GiftReveal({ gift }: { gift: GiftView }) {
  const [opened, setOpened] = useState(false);

  if (!opened) {
    return (
      <div className="container gift-page">
        <div style={{ textAlign: "center" }}>
          <p className="muted">누군가 당신을 위해 노래를 만들었어요</p>
          <h1 style={{ fontSize: 28, margin: "0 0 28px" }}>{gift.callName}에게 온 선물</h1>
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
      {gift.message && (
        <div className="card" style={{ textAlign: "center", fontFamily: "var(--serif)", fontSize: 19, marginBottom: 16 }}>
          “{gift.message}”
        </div>
      )}
      <div className="card">
        <MockPlayer title={gift.title} subtitle={`${gift.callName}만을 위한 ${gift.genre}`} />
      </div>
      <div style={{ marginTop: 16 }}>
        <LyricsSheet lyrics={gift.lyrics} />
      </div>
      <div className="card" style={{ marginTop: 24, textAlign: "center" }}>
        <p style={{ margin: "0 0 12px" }}>나도 소중한 사람에게 노래를 선물하고 싶다면</p>
        <Link href="/" className="btn">
          Only U song 둘러보기
        </Link>
      </div>
    </div>
  );
}
