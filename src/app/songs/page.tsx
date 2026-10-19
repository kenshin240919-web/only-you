"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import LyricsCard from "@/components/LyricsCard";
import LyricsSheet from "@/components/LyricsSheet";
import PhoneField, { isPhone } from "@/components/PhoneField";
import SongPlayer from "@/components/SongPlayer";
import { usePaymentProvider } from "@/components/usePaymentProvider";
import { useOrder } from "@/components/useOrder";
import { type Draft, type Lyrics, callName, clearOrder, genreLabel } from "@/lib/draft";
import { GENRES, VOCALS, labelOf } from "@/lib/options";
import { ADDON_PAIR, type Item, MAX_REVISIONS, PRICES, formatWon, isAllInOne } from "@/lib/pricing";

type SongStatus = "generating" | "ready" | "failed" | "disabled" | "none";

type ServerOrder = {
  orderNo: string;
  giftToken: string;
  giftEnabled: boolean;
  draft: Draft;
  lyrics: Lyrics;
  payment: "ready" | "paid" | "cancelled";
  owned: Item[];
  pendingPurchase: boolean;
  revisions: { used: number; max: number; freeLeft: number };
  song: { status: SongStatus; title: string | null; lyrics: Lyrics | null; version: string | null };
};

const POLL_MS = 3000;
// 결제창에서 돌아온 뒤 결제 확인을 기다리는 최대 시간. 결제를 마치지 않은 구매 때문에 계속 확인하지 않도록 한다.
const PENDING_WAIT_MS = 2 * 60 * 1000;

export default function SongsPage() {
  const [order] = useOrder();
  const provider = usePaymentProvider();
  const [song, setSong] = useState<ServerOrder | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rev, setRev] = useState({ genre: "", vocal: "", note: "" });

  // 주문을 불러오고, 만드는 중이거나 결제 확인을 기다리는 동안은 3초마다 다시 확인한다.
  useEffect(() => {
    if (!order) return;
    if (!order.orderId || !order.ownerToken) {
      setStatus("missing");
      return;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const started = Date.now();
    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${order.orderId}`, { headers: { "x-owner-token": order.ownerToken ?? "" } });
        if (res.status === 404) return setStatus("missing");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as ServerOrder;
        if (stopped) return;
        setSong(data);
        setStatus("ready");
        const waiting = data.song.status === "generating" || (data.pendingPurchase && Date.now() - started < PENDING_WAIT_MS);
        if (waiting) timer = setTimeout(load, POLL_MS);
      } catch {
        if (!stopped) setStatus("error");
      }
    };
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [order, refresh]);

  // 음원은 주문자 토큰을 헤더로 보내야 하므로 받아서 브라우저 안의 주소로 재생한다. 수정본이 나오면 다시 받는다.
  const version = song?.song.status === "ready" ? song.song.version ?? "ready" : null;
  useEffect(() => {
    if (!version || !order?.orderId || !order.ownerToken) return;
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
  }, [version, order]);

  if (!order || status === "loading") return null;
  if (status === "error") {
    return <EmptyState title="노래를 불러오지 못했어요" desc="잠시 후 다시 시도해 주세요." href="/songs" cta="다시 시도" />;
  }
  if (status === "missing" || !song) {
    return <EmptyState title="아직 완성된 노래가 없어요" desc="첫 노래를 만들어 보세요." href="/create" cta="노래 만들기" />;
  }
  if (song.payment !== "paid") {
    return <EmptyState title="결제가 확인되지 않은 주문이에요" desc="주문 상태를 확인해 주세요." href="/orders" cta="주문 상태 보기" />;
  }

  const d = song.draft;
  const title = song.song.title ?? song.lyrics.title;
  const lyrics = song.song.lyrics ?? song.lyrics;
  const ready = song.song.status === "ready";
  const generating = song.song.status === "generating";
  const hasMp3 = song.owned.includes("mp3");
  const hasCard = song.owned.includes("card");
  const needPhone = provider === "payapp";
  const phoneOk = !needPhone || isPhone(phone);
  const note = generating
    ? "노래를 만들고 있어요. 보통 1분 안에 끝나요."
    : ready
      ? audioUrl
        ? undefined
        : "음원을 불러오고 있어요"
      : "노래 제작이 아직 진행되지 않았어요. 확인 후 이메일로 안내해 드릴게요.";
  const giftUrl = `${window.location.origin}/gift/${song.giftToken}`;
  const headers = { "content-type": "application/json", "x-owner-token": order.ownerToken ?? "" };
  const revLeft = song.revisions.max - song.revisions.used;
  const freeRev = song.revisions.freeLeft > 0;

  // 결제가 필요하면 페이앱 결제창으로 보내고, 아니면(모의 결제·무료 수정) 바로 다시 불러온다.
  const post = async (path: string, body: object) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${order.orderId}/${path}`, { method: "POST", headers, body: JSON.stringify({ ...body, phone }) });
      if (!res.ok) throw new Error(String(res.status));
      const { payurl } = (await res.json()) as { payurl: string | null };
      if (payurl) {
        window.location.href = payurl;
        return;
      }
      setRev({ genre: "", vocal: "", note: "" });
      setRefresh((n) => n + 1);
    } catch {
      setError("요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  };

  const buy = (items: ("mp3" | "card")[]) => post("purchase", { items });
  const revise = () => post("revise", rev);

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
      const res = await fetch(`/api/orders/${order.orderId}`, { method: "PATCH", headers, body: JSON.stringify({ giftEnabled: enabled }) });
      if (res.ok) setSong({ ...song, giftEnabled: enabled });
    } finally {
      setSaving(false);
    }
  };

  const missing = (["mp3", "card"] as const).filter((i) => !song.owned.includes(i));

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
          src={generating ? null : audioUrl}
          note={note}
        />
        {hasMp3 && (
          <div className="actions-row" style={{ justifyContent: "center" }}>
            {audioUrl && ready ? (
              <a className="btn-ghost" href={audioUrl} download={`${title}.mp3`}>
                ⬇ MP3 다운로드
              </a>
            ) : (
              <button type="button" className="btn-ghost" disabled>
                ⬇ MP3 다운로드
              </button>
            )}
          </div>
        )}
      </div>

      {(missing.length > 0 || error) && (
        <div className="card stack" style={{ marginTop: 16 }}>
          {missing.length > 0 && (
            <>
              <div>
                <strong>더 오래 간직하기</strong>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
                  {song.pendingPurchase ? "결제를 확인하고 있어요. 잠시만 기다려 주세요." : "노래를 저장하거나 가사를 선물용 카드로 받아 보세요."}
                </p>
              </div>
              {needPhone && <PhoneField id="phone" value={phone} onChange={setPhone} />}
              <div className="actions-row" style={{ margin: 0 }}>
                {missing.length === 2 && (
                  <button type="button" className="btn" disabled={busy || !phoneOk} onClick={() => buy(["mp3", "card"])}>
                    MP3 + 가사 카드 {formatWon(ADDON_PAIR)} (수정 {MAX_REVISIONS}회 무료로)
                  </button>
                )}
                {missing.map((i) => (
                  <button key={i} type="button" className="btn-ghost" disabled={busy || !phoneOk} onClick={() => buy([i])}>
                    {i === "mp3" ? "MP3 다운로드" : "가사 카드"} {formatWon(PRICES[i])}
                  </button>
                ))}
              </div>
            </>
          )}
          {error && (
            <p className="field-error" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}
        </div>
      )}

      {hasCard && ready && lyrics.sections.length > 0 && (
        <div className="card stack" style={{ marginTop: 16 }}>
          <strong>가사 카드</strong>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            배경을 고른 뒤 이미지로 저장하세요. 카드의 QR 코드를 찍으면 이 노래의 선물 페이지가 열려요.
          </p>
          <LyricsCard
            lyrics={{ ...lyrics, title }}
            to={callName(d)}
            message={d.message.trim()}
            giftUrl={giftUrl}
            giftEnabled={song.giftEnabled}
          />
        </div>
      )}

      <div className="card stack" style={{ marginTop: 16 }}>
        <div>
          <strong>노래 수정</strong>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
            같은 이야기 안에서 가사 표현, 장르, 보컬을 바꿔 다시 만들어요. 남은 횟수 {revLeft}/{song.revisions.max}회 (
            {isAllInOne(song.owned) ? "올인원이라 모두 무료" : `첫 1회 무료, 이후 회당 ${formatWon(PRICES.revision)}`}). 이름·호칭이
            틀렸거나 추억이 빠졌다면 횟수와 관계없이{" "}
            <Link href="/refund">무료로 다시 만들어 드려요</Link>.
          </p>
        </div>
        {revLeft > 0 ? (
          <>
            <div className="revise-grid">
              <label className="field" style={{ margin: 0 }}>
                <span className="field-label">장르</span>
                <select id="rev-genre" className="input" value={rev.genre} onChange={(e) => setRev({ ...rev, genre: e.target.value })}>
                  <option value="">그대로 ({genreLabel(d)})</option>
                  {GENRES.filter((g) => g.value !== d.genre).map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span className="field-label">보컬</span>
                <select id="rev-vocal" className="input" value={rev.vocal} onChange={(e) => setRev({ ...rev, vocal: e.target.value })}>
                  <option value="">그대로 ({labelOf(VOCALS, d.vocal)})</option>
                  {VOCALS.filter((v) => v.value !== d.vocal).map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field" style={{ margin: 0 }}>
              <span className="field-label">바꾸고 싶은 점 (선택)</span>
              <textarea
                id="rev-note"
                className="input"
                rows={3}
                maxLength={300}
                value={rev.note}
                placeholder="예: 후렴을 더 밝게, 2절에 생일 축하 내용을 넣어 주세요."
                onChange={(e) => setRev({ ...rev, note: e.target.value })}
              />
            </label>
            {!freeRev && needPhone && missing.length === 0 && <PhoneField id="rev-phone" value={phone} onChange={setPhone} />}
            <button
              type="button"
              className="btn btn-block"
              disabled={busy || !ready || (!rev.genre && !rev.vocal && !rev.note.trim()) || (!freeRev && !phoneOk)}
              onClick={revise}
            >
              {generating ? "다시 만드는 중…" : freeRev ? "무료 수정 요청" : `${formatWon(PRICES.revision)} 결제하고 수정 요청`}
            </button>
            <small className="muted">수정본이 나오면 지금 노래를 대신해요. 이전 노래로 되돌리려면 문의해 주세요.</small>
          </>
        ) : (
          <p className="muted" style={{ margin: 0 }}>수정 횟수를 모두 사용했어요.</p>
        )}
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
          <input type="checkbox" checked={song.giftEnabled} disabled={saving} onChange={(e) => toggleGift(e.target.checked)} />
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

      {lyrics.sections.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <LyricsSheet lyrics={{ ...lyrics, title }} />
        </div>
      )}

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
