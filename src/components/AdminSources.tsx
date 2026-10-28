"use client";

import { useEffect, useState } from "react";
import type { Funnel, SourceRow } from "@/app/api/admin/sources/route";
import { formatWon } from "@/lib/pricing";

const NAMES: Record<string, string> = {
  direct: "직접 · 경로 모름",
  other: "기타 사이트",
  saju: "사주 이루리라",
  naver: "네이버",
  google: "구글",
  daum: "다음",
  instagram: "인스타그램",
  insta: "인스타그램 링크",
  threads: "스레드",
  facebook: "페이스북",
  kakao: "카카오",
  youtube: "유튜브",
};

const PERIODS = [
  { days: 1, label: "오늘" },
  { days: 7, label: "7일" },
  { days: 30, label: "30일" },
  { days: 0, label: "전체" },
];

const rate = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "-");

/** 관리자: 유입 경로(?src=)별 방문·주문·결제·매출. */
export default function AdminSources() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<SourceRow[] | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    fetch(`/api/admin/sources?days=${days}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ rows: SourceRow[]; funnel: Funnel }>) : null))
      .then((d) => {
        if (!live) return;
        setRows(d?.rows ?? []);
        setFunnel(d?.funnel ?? null);
      })
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [days, reload]);

  const resetVisits = async () => {
    if (!window.confirm("방문 기록과 단계별 숫자를 모두 지울까요? 시험 방문을 정리할 때 쓰세요. 주문·매출은 그대로예요.")) return;
    await fetch("/api/admin/sources", { method: "DELETE" });
    setReload((n) => n + 1);
  };

  return (
    <section className="card stack admin-sources" aria-label="유입 경로">
      <div className="row-between" style={{ padding: 0 }}>
        <strong>유입 경로</strong>
        <div className="admin-periods" role="radiogroup" aria-label="기간">
          {PERIODS.map((p) => (
            <button key={p.days} type="button" role="radio" aria-checked={days === p.days} className={days === p.days ? "selected" : ""} onClick={() => setDays(p.days)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {funnel && (
        <div className="funnel" aria-label="단계별 숫자">
          {[
            ["방문", funnel.visits],
            ["만들기 시작", funnel.create],
            ["주문 확인 도착", funnel.checkout],
            ["주문", funnel.orders],
            ["결제", funnel.paid],
          ].map(([label, n], i, arr) => (
            <div key={label as string} className="funnel-step">
              <strong>{(n as number).toLocaleString("ko-KR")}</strong>
              <span>{label}</span>
              {i > 0 && (arr[i - 1][1] as number) > 0 && (
                <small className="muted">{Math.round(((n as number) / (arr[i - 1][1] as number)) * 100)}%</small>
              )}
            </div>
          ))}
          {funnel.free > 0 && (
            <div className="funnel-step">
              <strong>{funnel.free}</strong>
              <span>무료(오픈·쿠폰)</span>
            </div>
          )}
        </div>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>경로</th>
              <th>방문</th>
              <th>주문</th>
              <th>결제</th>
              <th>결제율</th>
              <th>매출</th>
            </tr>
          </thead>
          <tbody>
            {rows?.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  아직 기록이 없어요.
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r.src}>
                <td>
                  {NAMES[r.src] ?? r.src}
                  {NAMES[r.src] && r.src !== "direct" && r.src !== "other" && <small className="muted"> {r.src}</small>}
                </td>
                <td>{r.visits.toLocaleString("ko-KR")}</td>
                <td>{r.orders}</td>
                <td>{r.paidOrders}</td>
                <td>{rate(r.paidOrders, r.visits)}</td>
                <td>{formatWon(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <small className="muted">
        <button type="button" className="link-btn" onClick={resetVisits}>
          방문 기록 지우기
        </button>{" "}
        · 홍보 링크 뒤에 <code>?src=이름</code>을 붙이면 따로 집계돼요. 예: <code>https://song.guidejung.com/?src=insta</code> (영문 소문자·숫자·-·_ 24자까지). 방문은 브라우저를 열 때마다 1번, 경로는 30일 동안 기억해요. 결제는 노래가 결제된 주문 수, 결제율은 방문 대비 결제, 매출은 그 경로 주문의 모든 결제(추가 구매 포함)예요.
      </small>
    </section>
  );
}
