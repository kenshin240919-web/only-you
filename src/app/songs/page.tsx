"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import LyricsSheet from "@/components/LyricsSheet";
import SongPlayer from "@/components/SongPlayer";
import { useOrder } from "@/components/useOrder";
import { type Draft, type Lyrics, callName, clearOrder, genreLabel } from "@/lib/draft";
import { VOCALS, labelOf } from "@/lib/options";

type ServerOrder = {
  orderNo: string;
  giftToken: string;
  giftEnabled: boolean;
  draft: Draft;
  lyrics: Lyrics;
  song: { status: "generating" | "ready" | "failed" | "disabled" | "none"; title: string | null; lyrics: Lyrics | null };
};

export default function SongsPage() {
  const [order] = useOrder();
  const [song, setSong] = useState<ServerOrder | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;
    if (!order.orderId || !order.ownerToken) {
      setStatus("missing");
      return;
    }
    fetch(`/api/orders/${order.orderId}`, { headers: { "x-owner-token": order.ownerToken } })
      .then(async (res) => {
        if (res.status === 404) return setStatus("missing");
        if (!res.ok) throw new Error(String(res.status));
        setSong((await res.json()) as ServerOrder);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [order]);

  // 음원은 주문자 토큰을 헤더로 보내야 하므로 받아서 브라우저 안의 주소로 재생한다.
  const ready = song?.song.status === "ready";
  useEffect(() => {
    if (!ready || !order?.orderId || !order.ownerToken) return;
    let url: string | null = null;
    fetch(`/api/orders/${order.orderId}/audio`, { headers: { "x-owner-token": order.ownerToken } })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob) return;
        url = URL.createObjectURL(blob);
        setAudioUrl(url);
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [ready, order]);

  if (!order || status === "loading") return null;
  if (status === "error") {
    return <EmptyState title="노래를 불러오지 못했어요" desc="잠시 후 다시 시도해 주세요." href="/songs" cta="다시 시도" />;
  }
  if (status === "missing" || !song) {
    return <EmptyState title="아직 완성된 노래가 없어요" desc="첫 노래를 만들어 보세요." href="/create" cta="노래 만들기" />;
  }

  const d = song.draft;
  const title = song.song.title ?? song.lyrics.title;
  const lyrics = song.song.lyrics ?? song.lyrics;
  const note =
    song.song.status === "generating"
      ? "노래를 만들고 있어요. 잠시 후 새로고침해 주세요."
      : song.song.status === "ready"
        ? audioUrl
          ? undefined
          : "음원을 불러오고 있어요"
        : "노래 제작이 아직 진행되지 않았어요. 확인 후 이메일로 안내해 드릴게요.";
  const giftUrl = `${window.location.origin}/gift/${song.giftToken}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(giftUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const toggleGift = async (enabled: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-owner-token": order.ownerToken ?? "" },
        body: JSON.stringify({ giftEnabled: enabled }),
      });
      if (res.ok) setSong({ ...song, giftEnabled: enabled });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <h1>내 노래</h1>
        <p>주문번호 {song.orderNo} · 이 페이지는 나만 볼 수 있어요.</p>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <SongPlayer
          title={title}
          subtitle={`${callName(d)}에게 · ${genreLabel(d)} · ${labelOf(VOCALS, d.vocal)}`}
          src={audioUrl}
          note={note}
        />
        <div className="actions-row" style={{ justifyContent: "center" }}>
          {audioUrl ? (
            <a className="btn-ghost" href={audioUrl} download={`${title}.mp3`}>
              ⬇ MP3 다운로드
            </a>
          ) : (
            <button type="button" className="btn-ghost" disabled>
              ⬇ MP3 다운로드
            </button>
          )}
          <button type="button" className="btn-ghost" onClick={() => alert("시제품: 재제작 요청 화면은 다음 단계에서 만들어요.")}>
            재제작 요청 (1회)
          </button>
        </div>
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <div>
          <strong>선물 링크</strong>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            링크를 받은 사람은 노래·가사·전하는 말을 볼 수 있어요. 결제 정보와 원래 사연은 보이지 않아요. 링크를 끄면
            더 이상 열리지 않아요.
          </p>
        </div>
        <label className="checkbox" style={{ margin: 0 }}>
          <input
            type="checkbox"
            checked={song.giftEnabled}
            disabled={saving}
            onChange={(e) => toggleGift(e.target.checked)}
          />
          <span>선물 링크 켜기</span>
        </label>
        {song.giftEnabled && (
          <div className="actions-row" style={{ margin: 0 }}>
            <button type="button" className="btn" onClick={copy}>
              {copied ? "복사했어요" : "선물 링크 복사"}
            </button>
            <Link href={`/gift/${song.giftToken}`} className="btn-ghost">
              받는 사람 화면 미리보기
            </Link>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <LyricsSheet lyrics={lyrics} />
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
          이 기기에서 지우고 새 노래 만들기
        </button>
      </p>
    </div>
  );
}
