"use client";

import { useCallback, useEffect, useState } from "react";

type Promo = { enabled: boolean; limit: number; used: number; left: number; active: boolean; claims: { created_at: string; order_no: string }[] };

const kst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 관리자: 오픈 기념 선착순 무료 켜기·끄기, 인원, 받은 주문. 인원이 차면 자동으로 마감된다. */
export default function AdminPromo() {
  const [p, setP] = useState<Promo | null>(null);
  const [limit, setLimit] = useState(5);
  const [busy, setBusy] = useState(false);

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
    if (enabled && !window.confirm(`오픈 기념 무료를 켤까요? 선착순 ${limit}명(지금까지 ${p?.used ?? 0}명 포함)까지 올인원을 무료로 드려요.`)) return;
    setBusy(true);
    await fetch("/api/admin/promo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled, limit }) });
    setBusy(false);
    await load();
  };

  if (!p) return null;
  return (
    <section className={p.active ? "card stack stat warn" : "card stack"} style={{ marginBottom: 16 }} aria-label="오픈 기념 무료">
      <div className="row-between" style={{ padding: 0 }}>
        <strong>🎉 오픈 기념 무료 (올인원 · 수정 1회)</strong>
        <span className={p.active ? "chip pay-paid" : "chip chip-muted"}>{p.active ? "진행 중" : p.enabled ? "마감" : "꺼짐"}</span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        받은 사람 {p.used}명 / 인원 {p.limit}명 · 남은 자리 {p.left}. 인원이 차면 자동으로 마감되고, 주문마다 운영자 메일이 가요.
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
      {p.claims.length > 0 && (
        <small className="muted">
          {p.claims.map((c, i) => (
            <span key={c.order_no}>
              {i + 1}. {c.order_no} ({kst(c.created_at)})
              <br />
            </span>
          ))}
        </small>
      )}
    </section>
  );
}
