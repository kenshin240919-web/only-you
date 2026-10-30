"use client";

import { useCallback, useEffect, useState } from "react";

type Promo = { enabled: boolean; limit: number; used: number; left: number; active: boolean; claims: { created_at: string; order_no: string; video: number }[] };

const kst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 관리자: 오픈 기념 선착순 무료 켜기·끄기, 인원, 받은 주문. 인원이 차면 자동으로 마감된다. */
export default function AdminPromo() {
  const [p, setP] = useState<Promo | null>(null);
  const [limit, setLimit] = useState(5);
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/promo");
    if (!r.ok) return;
    const d = (await r.json()) as Promo;
    setP(d);
    setLimit(d.limit);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (enabled: boolean) => {
    if (enabled && !window.confirm(`오픈 기념 무료를 켤까요? 선착순 ${limit}명(지금까지 ${p?.used ?? 0}명 포함)까지 노래를 무료로 드려요.`)) return;
    setBusy(true);
    await fetch("/api/admin/promo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled, limit }) });
    setBusy(false);
    await load();
  };

  const makeCoupon = async () => {
    if (!window.confirm("무료 노래 쿠폰(노래 듣기만 · 1년)을 하나 만들까요? 쓰면 ElevenLabs 크레딧이 1곡만큼 들어요.")) return;
    setBusy(true);
    const r = await fetch("/api/admin/coupons", { method: "POST" });
    setBusy(false);
    setCoupon(r.ok ? ((await r.json()) as { code: string }).code : "만들지 못했어요");
  };

  if (!p) return null;
  return (
    <section className={p.active ? "card stack stat warn" : "card stack"} style={{ marginBottom: 16 }} aria-label="오픈 기념 무료">
      <div className="row-between" style={{ padding: 0 }}>
        <strong>🎉 오픈 기념 무료 (노래 · 수정 1회)</strong>
        <span className={p.active ? "chip pay-paid" : "chip chip-muted"}>{p.active ? "진행 중" : p.enabled ? "마감" : "꺼짐"}</span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        받은 사람 {p.used}명 / 인원 {p.limit}명 · 남은 자리 {p.left}. 인원이 차면 자동으로 마감되고, 주문마다 운영자 메일이 가요. 반응 영상을
        받으면 그 주문의 &lsquo;반응 영상 혜택&rsquo;으로 MP3·가사 카드를 열어 주세요.
      </p>
      <div className="row-between" style={{ gap: 8, padding: 0 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          인원
          <input className="input" type="number" min={1} max={100} value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ width: 80 }} />명
        </label>
        {p.enabled ? (
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => save(true)}>
              인원 저장
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => save(false)}>
              끄기
            </button>
          </span>
        ) : (
          <button type="button" className="btn" disabled={busy} onClick={() => save(true)}>
            켜기
          </button>
        )}
      </div>
      <div className="row-between" style={{ gap: 8, padding: 0 }}>
        <small className="muted">시험곡 · 고객 응대용 무료 노래 쿠폰 (결제 화면에서 입력)</small>
        <button type="button" className="btn-ghost" disabled={busy} onClick={makeCoupon}>
          쿠폰 만들기
        </button>
      </div>
      {coupon && <strong style={{ userSelect: "all" }}>{coupon}</strong>}
      {p.claims.length > 0 && (
        <small className="muted">
          {p.claims.map((c, i) => (
            <span key={c.order_no}>
              {i + 1}. {c.order_no} ({kst(c.created_at)}) ·{" "}
              {c.video ? "영상 받음" : `영상 마감 ${kst(new Date(new Date(c.created_at).getTime() + 7 * 86400 * 1000).toISOString())}`}
              <br />
            </span>
          ))}
        </small>
      )}
    </section>
  );
}
