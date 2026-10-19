"use client";

import Link from "next/link";
import { useState } from "react";
import EmptyState from "@/components/EmptyState";
import LyricsSheet from "@/components/LyricsSheet";
import MockPlayer from "@/components/MockPlayer";
import { useOrder } from "@/components/useOrder";
import { callName, clearOrder, genreLabel } from "@/lib/draft";
import { VOCALS, labelOf } from "@/lib/options";

export default function SongsPage() {
  const [order] = useOrder();
  const [copied, setCopied] = useState(false);
  const [giftOn, setGiftOn] = useState(true);

  if (!order) return null;
  if (!order.paidAt || !order.lyrics) {
    return <EmptyState title="아직 완성된 노래가 없어요" desc="첫 노래를 만들어 보세요." href="/create" cta="노래 만들기" />;
  }

  const d = order.draft;
  const giftUrl = typeof window !== "undefined" ? `${window.location.origin}/gift` : "/gift";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(giftUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <h1>내 노래</h1>
        <p>이 페이지는 나만 볼 수 있어요.</p>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <MockPlayer
          title={order.lyrics.title}
          subtitle={`${callName(d)}에게 · ${genreLabel(d)} · ${labelOf(VOCALS, d.vocal)}`}
        />
        <div className="actions-row" style={{ justifyContent: "center" }}>
          <button type="button" className="btn-ghost" disabled title="실제 음원 연결 후 활성화됩니다">
            ⬇ MP3 다운로드 (준비 중)
          </button>
          <button type="button" className="btn-ghost" onClick={() => alert("시제품: 재제작 요청 화면은 다음 단계에서 만들어요.")}>
            재제작 요청 (1회)
          </button>
        </div>
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <div>
          <strong>선물 링크</strong>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            링크를 받은 사람은 노래·가사·전하는 말을 볼 수 있어요. 결제 정보와 원래 사연은 보이지 않아요.
          </p>
        </div>
        <label className="checkbox" style={{ margin: 0 }}>
          <input type="checkbox" checked={giftOn} onChange={(e) => setGiftOn(e.target.checked)} />
          <span>선물 링크 켜기</span>
        </label>
        {giftOn && (
          <div className="actions-row" style={{ margin: 0 }}>
            <button type="button" className="btn" onClick={copy}>
              {copied ? "복사했어요" : "선물 링크 복사"}
            </button>
            <Link href="/gift" className="btn-ghost">
              받는 사람 화면 미리보기
            </Link>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <LyricsSheet lyrics={order.lyrics} />
      </div>

      <p style={{ textAlign: "center", marginTop: 24 }}>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            clearOrder();
            window.location.href = "/create";
          }}
        >
          시제품 데이터 지우고 처음부터
        </button>
      </p>
    </div>
  );
}
