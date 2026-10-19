"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import { useOrder } from "@/components/useOrder";

const STAGES = [
  { key: "paid", label: "결제 확인" },
  { key: "queued", label: "제작 대기" },
  { key: "generating", label: "노래 만드는 중" },
  { key: "checking", label: "파일 검사" },
  { key: "ready", label: "완성" },
];

// 시제품에서는 결제 후 경과 시간으로 단계를 흉내 낸다 (단계당 3초).
const STAGE_MS = 3000;

export default function OrdersPage() {
  const [order] = useOrder();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  if (!order) return null;
  if (!order.paidAt) {
    return <EmptyState title="진행 중인 주문이 없어요" desc="노래를 만들어 볼까요?" href="/create" cta="노래 만들기" />;
  }

  const elapsed = now - new Date(order.paidAt).getTime();
  const current = Math.min(STAGES.length - 1, Math.floor(elapsed / STAGE_MS));
  const done = current === STAGES.length - 1;

  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <h1>{done ? "노래가 완성됐어요!" : "노래를 만들고 있어요"}</h1>
        <p>
          주문번호 {order.orderNo} · 완성되면 {order.draft.email}(으)로 알려 드려요. 이 창을 닫아도 제작은 계속돼요.
        </p>
      </div>

      <ol className="status-steps" aria-live="polite">
        {STAGES.map((s, i) => (
          <li key={s.key} className={i < current || done ? "done" : i === current ? "current" : ""}>
            <span className="status-dot">{i < current || done ? "✓" : i + 1}</span>
            {s.label}
            {i === current && !done && <span className="muted"> · 진행 중</span>}
          </li>
        ))}
      </ol>

      <p className="notice">
        시제품에서는 3초마다 다음 단계로 넘어가요. 실제 서비스는 서버의 작업 상태를 그대로 보여 주며, 가짜 진행률을 쓰지
        않습니다.
      </p>

      {done && (
        <Link href="/songs" className="btn btn-block">
          노래 들으러 가기
        </Link>
      )}
    </div>
  );
}
