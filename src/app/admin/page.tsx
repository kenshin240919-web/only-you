"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPromo from "@/components/AdminPromo";
import AdminReviews from "@/components/AdminReviews";
import AdminSources from "@/components/AdminSources";
import LyricsSheet from "@/components/LyricsSheet";
import type { Draft, Lyrics } from "@/lib/draft";
import { genreLabel, reasonLabel, relationshipLabel } from "@/lib/draft";
import { GENRES, VOCALS, labelOf } from "@/lib/options";
import { ITEM_LABELS, type Item, formatWon, isAllInOne } from "@/lib/pricing";

type Summary = {
  ordersToday: number;
  ordersMonth: number;
  revenueToday: number;
  paymentsToday: number;
  revenueMonth: number;
  paymentsMonth: number;
  cycleStart: string;
  cycleNext: string;
  generationsCycle: number;
  creditsCycle: number;
  planCredits: number;
  songsLeft: number;
  songs: Record<string, number>;
};

type ListRow = {
  id: string;
  orderNo: string;
  email: string;
  createdAt: string;
  to: string;
  songStatus: string;
  songTitle: string | null;
  paidTotal: number;
  pending: boolean;
  cancelled: boolean;
  legacy: boolean;
};

type Detail = {
  id: string;
  orderNo: string;
  email: string;
  createdAt: string;
  giftToken: string;
  giftEnabled: boolean;
  draft: Draft;
  payment: string;
  owned: Item[];
  bought: Item[];
  lock: { locked: boolean; reason: "expired" | "admin" | null; deadline: string | null };
  rewards: { kind: "video" | "text"; benefit: string; couponCode: string | null; createdAt: string }[];
  purchases: { id: string; items: Item[]; amount: number; provider: string; status: string; providerRef: string | null; createdAt: string; paidAt: string | null }[];
  revisions: { id: string; paid: boolean; status: string; request: { genre?: string; vocal?: string; note?: string }; createdAt: string }[];
  song: { status: string; title: string | null; lyrics: Lyrics | null; audioKey: string | null; error: string | null; startedAt: string; finishedAt: string | null } | null;
};

const SONG_STATUS: Record<string, string> = {
  generating: "만드는 중",
  ready: "완성",
  failed: "실패",
  disabled: "생성 꺼짐",
  none: "제작 전",
};
const PAY_STATUS: Record<string, string> = { ready: "결제 대기", paid: "결제 완료", cancelled: "취소" };
const PROVIDER: Record<string, string> = { mock: "모의 결제", reward: "후기 혜택", coupon: "무료 쿠폰", promo: "오픈 기념 무료" };
const BENEFIT: Record<string, string> = { addons: "MP3 + 가사 카드", card: "가사 카드", coupon: "다음 노래 1곡 무료 쿠폰" };

const kst = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

export default function AdminPage() {
  const [auth, setAuth] = useState<{ enabled: boolean; loggedIn: boolean } | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ListRow[]>([]);
  const [q, setQ] = useState("");
  const [failedOnly, setFailedOnly] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [regen, setRegen] = useState({ genre: "", vocal: "", note: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mailMsg, setMailMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => r.json() as Promise<{ enabled: boolean; loggedIn: boolean }>)
      .then(setAuth)
      .catch(() => setAuth({ enabled: false, loggedIn: false }));
  }, []);

  const loadList = useCallback(async () => {
    const params = new URLSearchParams({ q, ...(failedOnly ? { status: "failed" } : {}) });
    const [s, l] = await Promise.all([fetch("/api/admin/summary"), fetch(`/api/admin/orders?${params}`)]);
    if (s.status === 403) return setAuth((a) => (a ? { ...a, loggedIn: false } : a));
    setSummary((await s.json()) as Summary);
    setRows((await l.json()) as ListRow[]);
  }, [q, failedOnly]);

  const loadDetail = useCallback(async (id: string) => {
    const r = await fetch(`/api/admin/orders/${id}`);
    if (r.ok) setDetail((await r.json()) as Detail);
  }, []);

  useEffect(() => {
    if (auth?.loggedIn) void loadList();
  }, [auth, loadList]);

  // 다시 만드는 중이면 완성될 때까지 상세를 다시 불러온다.
  useEffect(() => {
    if (detail?.song?.status !== "generating") return;
    const t = setTimeout(() => void loadDetail(detail.id), 3000);
    return () => clearTimeout(t);
  }, [detail, loadDetail]);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    if (r.ok) {
      setPassword("");
      setAuth({ enabled: true, loggedIn: true });
    } else setLoginError("비밀번호가 맞지 않아요.");
  };

  const act = async (body: object, confirmText: string) => {
    if (!detail || !window.confirm(confirmText)) return;
    setBusy(true);
    setMessage("");
    const r = await fetch(`/api/admin/orders/${detail.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await r.json().catch(() => ({}))) as { message?: string };
    setMessage(r.ok ? (data.message ?? "처리했어요.") : (data.message ?? "처리하지 못했어요."));
    setBusy(false);
    await Promise.all([loadDetail(detail.id), loadList()]);
  };

  if (!auth) return null;
  if (!auth.enabled) {
    return (
      <div className="container narrow admin">
        <div className="page-head">
          <h1>관리자</h1>
          <p>관리자 화면이 꺼져 있어요. Cloudflare 비밀 값 ADMIN_PASSWORD(12자 이상)를 등록하면 켜져요.</p>
        </div>
      </div>
    );
  }
  if (!auth.loggedIn) {
    return (
      <div className="container narrow admin">
        <div className="page-head">
          <h1>관리자 로그인</h1>
        </div>
        <form className="card stack" onSubmit={doLogin}>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">비밀번호</span>
            <input id="admin-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {loginError && (
            <p className="field-error" role="alert" style={{ margin: 0 }}>
              {loginError}
            </p>
          )}
          <button type="submit" className="btn btn-block" disabled={!password}>
            로그인
          </button>
        </form>
      </div>
    );
  }

  // 요금제 크레딧의 80%를 넘으면 강조한다.
  const usageWarn = summary ? summary.creditsCycle >= summary.planCredits * 0.8 : false;
  const day = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
  const failed = summary?.songs.failed ?? 0;

  return (
    <div className="container admin">
      <div className="page-head admin-head">
        <h1>관리자</h1>
        <button
          type="button"
          className="link-btn"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            setAuth({ enabled: true, loggedIn: false });
          }}
        >
          로그아웃
        </button>
      </div>

      {summary && (
        <div className="admin-stats">
          <div className="card stat">
            <span>오늘</span>
            <strong>{formatWon(summary.revenueToday)}</strong>
            <small className="muted">
              주문 {summary.ordersToday}건 · 결제 {summary.paymentsToday}건
            </small>
          </div>
          <div className="card stat">
            <span>이번 달 (한국 시간)</span>
            <strong>{formatWon(summary.revenueMonth)}</strong>
            <small className="muted">
              주문 {summary.ordersMonth}건 · 결제 {summary.paymentsMonth}건
            </small>
          </div>
          <div className={usageWarn ? "card stat warn" : "card stat"}>
            <span>ElevenLabs 사용 (이번 요금제 주기)</span>
            <strong>
              {summary.creditsCycle.toLocaleString("ko-KR")}
              <small className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
                {" "}
                / {summary.planCredits.toLocaleString("ko-KR")}크레딧
              </small>
            </strong>
            <small className="muted">
              {day(summary.cycleStart)}~{day(summary.cycleNext)} · 생성 {summary.generationsCycle}회 · 남은 약 {summary.songsLeft}곡 (추정)
            </small>
          </div>
          <button type="button" className={failed ? "card stat warn" : "card stat"} onClick={() => setFailedOnly(true)}>
            <span>제작 실패</span>
            <strong>{failed}건</strong>
            <small className="muted">눌러서 실패 주문만 보기</small>
          </button>
        </div>
      )}

      {summary && <AdminPromo />}
      {summary && <AdminSources />}
      {summary && <AdminReviews />}

      <p className="muted" style={{ margin: "0 0 12px", fontSize: 14 }}>
        <button
          type="button"
          className="link-btn"
          onClick={async () => {
            setMailMsg("보내는 중…");
            const r = await fetch("/api/admin/test-mail", { method: "POST" });
            const d = (await r.json().catch(() => ({}))) as { message?: string };
            setMailMsg(d.message ?? "보내지 못했어요.");
          }}
        >
          알림 메일 시험 발송
        </button>
        {mailMsg && ` · ${mailMsg}`}
      </p>

      <div className="admin-filter">
        <input id="admin-q" className="input" placeholder="주문번호나 이메일로 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="checkbox" style={{ margin: 0 }}>
          <input type="checkbox" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} />
          <span>실패만</span>
        </label>
      </div>

      <div className="admin-grid">
        <div className="card admin-list">
          {rows.length === 0 && <p className="muted">주문이 없어요.</p>}
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              className={detail?.id === r.id ? "admin-row selected" : "admin-row"}
              onClick={() => {
                setMessage("");
                setRegen({ genre: "", vocal: "", note: "" });
                void loadDetail(r.id);
              }}
            >
              <span className="admin-row-top">
                <strong>{r.orderNo}</strong>
                <span className="muted">{kst(r.createdAt)}</span>
              </span>
              <span className="admin-row-bottom">
                <span>{r.to}에게 · {r.email}</span>
                <span>{formatWon(r.paidTotal)}</span>
              </span>
              <span className="chips">
                <span className={`chip song-${r.songStatus}`}>{SONG_STATUS[r.songStatus] ?? r.songStatus}</span>
                {r.pending && <span className="chip">결제 대기</span>}
                {r.cancelled && <span className="chip chip-muted">취소 있음</span>}
                {r.legacy && <span className="chip chip-muted">시제품 주문</span>}
              </span>
            </button>
          ))}
        </div>

        {detail ? (
          <div className="stack admin-detail">
            <div className="card stack">
              <div>
                <strong>{detail.orderNo}</strong>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
                  {kst(detail.createdAt)} · {detail.email}
                </p>
              </div>
              <dl className="admin-dl">
                <dt>받는 분</dt>
                <dd>
                  {relationshipLabel(detail.draft)} · 이름 {detail.draft.name || "-"} · 호칭 {detail.draft.nickname || "-"}
                  {detail.draft.pronunciation && ` · 발음 ${detail.draft.pronunciation}`}
                </dd>
                <dt>마음 · 장르</dt>
                <dd>
                  {reasonLabel(detail.draft)} · {genreLabel(detail.draft)} · {labelOf(VOCALS, detail.draft.vocal)}
                </dd>
                <dt>어떤 사람</dt>
                <dd>{detail.draft.traits}</dd>
                <dt>추억</dt>
                <dd>{detail.draft.memory}</dd>
                <dt>전하는 말</dt>
                <dd>{detail.draft.message || "-"}</dd>
                <dt>빼고 싶은 내용</dt>
                <dd>{detail.draft.exclude || "-"}</dd>
                <dt>가진 상품</dt>
                <dd>{detail.owned.map((i) => ITEM_LABELS[i]).join(", ") || "-"}</dd>
              </dl>
            </div>

            <div className="card stack">
              <strong>결제</strong>
              {detail.purchases.length === 0 && <p className="muted" style={{ margin: 0 }}>결제 기록이 없는 시제품 주문이에요.</p>}
              {detail.purchases.map((p) => (
                <div key={p.id} className="admin-pay">
                  <span>
                    {p.items.map((i) => ITEM_LABELS[i]).join(" + ")}
                    <br />
                    <small className="muted">
                      {p.provider === "payapp" ? `페이앱 ${p.providerRef ?? ""}` : (PROVIDER[p.provider] ?? p.provider)} · {kst(p.paidAt ?? p.createdAt)}
                    </small>
                  </span>
                  <span className="admin-pay-right">
                    {formatWon(p.amount)}
                    <span className={`chip pay-${p.status}`}>{PAY_STATUS[p.status] ?? p.status}</span>
                    {p.status === "paid" && (
                      <button
                        type="button"
                        className="link-btn"
                        disabled={busy}
                        onClick={() =>
                          act(
                            { action: "cancel_purchase", purchaseId: p.id },
                            "이 결제를 취소로 표시할까요? 실제 환불은 페이앱 관리자 화면에서 해야 해요. 노래 결제면 선물 링크도 꺼져요.",
                          )
                        }
                      >
                        취소로 표시
                      </button>
                    )}
                  </span>
                </div>
              ))}
              <small className="muted">
                환불은 페이앱 판매자 화면에서 결제를 취소하면 자동으로 여기에 반영돼요. 반영되지 않았을 때만 &lsquo;취소로 표시&rsquo;를 쓰세요.
              </small>
            </div>

            <div className="card stack">
              <strong>후기 혜택</strong>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                받은 후기를 확인한 뒤 눌러 주세요. 내용이 좋든 아니든 솔직한 후기면 드려요. 지급하면 주문자에게 메일이 가요.
                <br />
                반응 영상: {isAllInOne(detail.bought) ? "올인원이라 다음 노래 1곡 무료 쿠폰" : "MP3 + 가사 카드"} · 글·사진 후기: 가사 카드
              </p>
              {detail.rewards.map((r) => (
                <small key={r.kind} className="muted">
                  {kst(r.createdAt)} · {r.kind === "video" ? "반응 영상" : "글·사진 후기"} → {BENEFIT[r.benefit] ?? r.benefit}
                  {r.couponCode && ` (${r.couponCode})`}
                </small>
              ))}
              <div className="row-between" style={{ gap: 8, padding: 0 }}>
                <button
                  type="button"
                  className="btn"
                  disabled={busy || detail.rewards.some((r) => r.kind === "video")}
                  onClick={() => act({ action: "reward", kind: "video" }, "반응 영상 후기 혜택을 드릴까요? 주문자에게 메일이 가요.")}
                >
                  반응 영상 혜택
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busy || detail.rewards.some((r) => r.kind === "text")}
                  onClick={() => act({ action: "reward", kind: "text" }, "글·사진 후기 혜택(가사 카드)을 드릴까요? 주문자에게 메일이 가요.")}
                >
                  글·사진 후기 혜택
                </button>
              </div>
            </div>

            <div className="card stack">
              <div className="admin-row-top">
                <strong>노래</strong>
                <span className={`chip song-${detail.song?.status ?? "none"}`}>{SONG_STATUS[detail.song?.status ?? "none"]}</span>
              </div>
              {detail.song?.error && <p className="field-error" style={{ margin: 0 }}>오류: {detail.song.error}</p>}
              {detail.song?.audioKey && detail.song.status !== "generating" && (
                <audio controls preload="none" src={`/api/admin/orders/${detail.id}/audio?v=${detail.song.finishedAt ?? ""}`} style={{ width: "100%" }} />
              )}
              <small className="muted">
                제작 {kst(detail.song?.startedAt ?? null)} → 완성 {kst(detail.song?.finishedAt ?? null)} · 선물 링크{" "}
                {detail.giftEnabled ? "켜짐" : "꺼짐"}{" "}
                <button
                  type="button"
                  className="link-btn"
                  disabled={busy}
                  onClick={() => act({ action: "gift", enabled: !detail.giftEnabled }, detail.giftEnabled ? "선물 링크를 끌까요?" : "선물 링크를 켤까요?")}
                >
                  {detail.giftEnabled ? "끄기" : "켜기"}
                </button>
              </small>
              <small className="muted">
                노래 듣기:{" "}
                {detail.lock.locked
                  ? detail.lock.reason === "expired"
                    ? "정지됨 (오픈 기념 무료 영상 기한 지남)"
                    : "정지됨 (관리자)"
                  : detail.lock.deadline
                    ? `열림 · 영상 마감 ${kst(detail.lock.deadline)}`
                    : "열림"}{" "}
                {detail.lock.locked ? (
                  <button type="button" className="link-btn" disabled={busy} onClick={() => act({ action: "lock", state: "open" }, "노래를 다시 열까요? 기한과 관계없이 계속 들을 수 있어요.")}>
                    다시 열기
                  </button>
                ) : (
                  <button
                    type="button"
                    className="link-btn"
                    disabled={busy}
                    onClick={() => act({ action: "lock", state: "locked" }, "노래 듣기를 정지할까요? 내 노래와 선물 링크에서 더 이상 들을 수 없어요.")}
                  >
                    정지
                  </button>
                )}
              </small>
              {detail.revisions.length > 0 && (
                <ul className="admin-revisions">
                  {detail.revisions.map((r) => (
                    <li key={r.id}>
                      {kst(r.createdAt)} · {r.paid ? "유료" : "무료"} 수정 ·{" "}
                      {r.status === "started" ? "진행" : r.status === "awaiting_payment" ? "결제 대기" : "취소"} ·{" "}
                      {[r.request.genre && labelOf(GENRES, r.request.genre), r.request.vocal && labelOf(VOCALS, r.request.vocal), r.request.note]
                        .filter(Boolean)
                        .join(" / ")}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card stack">
              <strong>시험 주문 지우기</strong>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                시험으로 만든 주문을 통계와 목록에서 완전히 지워요(결제·노래·음원 포함). 실제 손님 주문은 지우지 마세요. 페이앱 결제는 페이앱에서 먼저
                취소해 주세요.
              </p>
              <button
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={async () => {
                  const no = window.prompt(`지우려면 주문번호 ${detail.orderNo}를 그대로 입력하세요.`);
                  if (no !== detail.orderNo) return;
                  setBusy(true);
                  const r = await fetch(`/api/admin/orders/${detail.id}`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ action: "delete", orderNo: no }),
                  });
                  const d = (await r.json().catch(() => ({}))) as { message?: string };
                  setBusy(false);
                  setMessage(d.message ?? (r.ok ? "지웠어요." : "지우지 못했어요."));
                  if (r.ok) {
                    setDetail(null);
                    await loadList();
                  }
                }}
              >
                이 주문 지우기
              </button>
            </div>

            <div className="card stack">
              <strong>무료로 다시 만들기</strong>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                제작 실패나 우리 잘못(이름·호칭 오류, 추억 누락)일 때 쓰세요. 고객의 수정 횟수에 들어가지 않고, ElevenLabs 크레딧 2.5분을 써요.
              </p>
              <div className="revise-grid">
                <select id="regen-genre" className="input" value={regen.genre} onChange={(e) => setRegen({ ...regen, genre: e.target.value })}>
                  <option value="">장르 그대로</option>
                  {GENRES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
                <select id="regen-vocal" className="input" value={regen.vocal} onChange={(e) => setRegen({ ...regen, vocal: e.target.value })}>
                  <option value="">보컬 그대로</option>
                  {VOCALS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                id="regen-note"
                className="input"
                rows={2}
                maxLength={300}
                placeholder="AI에게 전할 요청 (예: 이름을 '순자'로 정확히 불러 주세요)"
                value={regen.note}
                onChange={(e) => setRegen({ ...regen, note: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-block"
                disabled={busy || detail.song?.status === "generating" || detail.payment !== "paid"}
                onClick={() => act({ action: "regenerate", ...regen }, "이 주문의 노래를 무료로 다시 만들까요? 크레딧 2.5분을 써요.")}
              >
                {detail.song?.status === "generating" ? "만드는 중…" : "다시 만들기"}
              </button>
              {message && <p style={{ margin: 0 }}>{message}</p>}
            </div>

            {detail.song?.lyrics && detail.song.lyrics.sections.length > 0 && <LyricsSheet lyrics={detail.song.lyrics} />}
          </div>
        ) : (
          <div className="card muted admin-detail">왼쪽에서 주문을 고르면 자세한 내용이 보여요.</div>
        )}
      </div>
    </div>
  );
}
