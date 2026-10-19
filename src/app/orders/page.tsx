"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { useOrder } from "@/components/useOrder";

type SongStatus = "generating" | "ready" | "failed" | "disabled" | "none";

const STAGES = [
  { key: "paid", label: "결제 확인" },
  { key: "generating", label: "가사 쓰고 노래 만드는 중" },
  { key: "ready", label: "완성" },
];

const POLL_MS = 3000;

export default function OrdersPage() {
  const [order] = useOrder();
  const [song, setSong] = useState<SongStatus | null>(null);

  // 서버의 실제 제작 상태를 3초마다 확인한다. 완성·실패하면 멈춘다.
  useEffect(() => {
    if (!order?.orderId || !order.ownerToken) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${order.orderId}`, { headers: { "x-owner-token": order.ownerToken ?? "" } });
        if (res.ok) {
          const status = ((await res.json()) as { song: { status: SongStatus } }).song.status;
          if (stopped) return;
          setSong(status);
          if (status !== "generating") return;
        }
      } catch {}
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [order]);

  if (!order) return null;
  if (!order.paidAt) {
    return <EmptyState title="진행 중인 주문이 없어요" desc="노래를 만들어 볼까요?" href="/create" cta="노래 만들기" />;
  }

  const done = song === "ready";
  const stopped = song === "failed" || song === "disabled" || song === "none";
  const current = done ? STAGES.length - 1 : 1;

  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <h1>{done ? "노래가 완성됐어요!" : stopped ? "제작이 잠시 멈췄어요" : "노래를 만들고 있어요"}</h1>
        <p>
          주문번호 {order.orderNo} · 이 창을 닫아도 제작은 계속되고, 완성된 노래는 '내 노래'에서 들을 수 있어요.
        </p>
      </div>

      <ol className="status-steps" aria-live="polite">
        {STAGES.map((s, i) => (
          <li key={s.key} className={i < current || done ? "done" : i === current ? "current" : ""}>
            <span className="status-dot">{i < current || done ? "✓" : i + 1}</span>
            {s.label}
            {i === current && !done && !stopped && <span className="muted"> · 진행 중 (보통 1분 안에 끝나요)</span>}
          </li>
        ))}
      </ol>

      {stopped && (
        <p className="notice">
          {song === "failed"
            ? "노래를 만드는 중에 문제가 생겼어요. 확인 후 이메일로 안내해 드릴게요."
            : "지금은 시험 운영 중이라 노래 제작이 꺼져 있어요. 제작이 시작되면 이메일로 알려 드릴게요."}
        </p>
      )}

      {done && (
        <Link href="/songs" className="btn btn-block">
          노래 들으러 가기
        </Link>
      )}
    </div>
  );
}
