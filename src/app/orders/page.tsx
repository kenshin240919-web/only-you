"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import Mascot from "@/components/Mascot";
import { useOrder } from "@/components/useOrder";

type SongStatus = "generating" | "ready" | "failed" | "disabled" | "none";
type PaymentStatus = "ready" | "paid" | "cancelled";

const STAGES = [
  { key: "paid", label: "결제 확인" },
  { key: "generating", label: "가사 쓰고 노래 만드는 중" },
  { key: "ready", label: "완성" },
];

const POLL_MS = 3000;

export default function OrdersPage() {
  const [order, setOrder] = useOrder();
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [song, setSong] = useState<SongStatus | null>(null);

  // 서버의 실제 결제·제작 상태를 3초마다 확인한다. 결제 대기 중이거나 만드는 중일 때만 계속 확인한다.
  useEffect(() => {
    if (!order?.orderId || !order.ownerToken) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${order.orderId}`, { headers: { "x-owner-token": order.ownerToken ?? "" } });
        if (res.ok) {
          const data = (await res.json()) as { payment: PaymentStatus; song: { status: SongStatus } };
          if (stopped) return;
          setPayment(data.payment);
          setSong(data.song.status);
          // 결제 직후에는 노래 기록이 생기기 전(none)일 수 있어서, 그때도 계속 확인한다.
          if (data.payment === "cancelled" || (data.payment === "paid" && data.song.status !== "generating" && data.song.status !== "none")) return;
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
  if (!order.orderId) {
    return <EmptyState title="진행 중인 주문이 없어요" desc="노래를 만들어 볼까요?" href="/create" cta="노래 만들기" />;
  }

  // 결제를 마치지 못했거나 취소된 주문은 이 기기에서 지우고, 같은 이야기로 다시 주문한다.
  // 결제창에서 방금 결제했을 수 있으니 먼저 상태를 다시 확인하고, 아직 대기 중이면 한 번 더 묻는다(두 번 결제 방지).
  const reorder = async () => {
    try {
      const res = await fetch(`/api/orders/${order.orderId}`, { headers: { "x-owner-token": order.ownerToken ?? "" } });
      if (res.ok) {
        const data = (await res.json()) as { payment: PaymentStatus };
        if (data.payment === "paid") return setPayment("paid");
      }
    } catch {}
    if (
      payment === "ready" &&
      !window.confirm(`결제창에서 이미 결제하셨다면 잠시 기다려 주세요(주문번호 ${order.orderNo}). 결제하지 않으셨다면 새로 주문할까요?`)
    )
      return;
    setOrder({ ...order, paidAt: null, orderNo: null, orderId: null, ownerToken: null, giftToken: null });
    window.location.href = "/checkout";
  };

  if (payment === "ready" || payment === "cancelled") {
    const cancelled = payment === "cancelled";
    return (
      <div className="container narrow" style={{ paddingBottom: 40 }}>
        <div className="page-head">
          <h1>{cancelled ? "결제가 취소됐어요" : "결제를 확인하고 있어요"}</h1>
          <p>
            주문번호 {order.orderNo} ·{" "}
            {cancelled
              ? "취소된 주문은 노래를 만들지 않아요."
              : "새 창에서 결제를 마치면 여기에서 바로 확인하고 노래를 만들기 시작해요."}
          </p>
        </div>
        <div className="card stack" style={{ marginTop: 20 }}>
          <p style={{ margin: 0 }}>
            {cancelled ? "같은 이야기로 다시 주문할 수 있어요." : "결제창을 닫았거나 결제를 마치지 못하셨다면 다시 결제해 주세요."}
          </p>
          <button type="button" className="btn btn-block" onClick={reorder}>
            {cancelled ? "다시 주문하기" : "결제 다시 하기"}
          </button>
        </div>
      </div>
    );
  }

  const done = song === "ready";
  const stopped = song === "failed" || song === "disabled" || song === "none";
  const current = done ? STAGES.length - 1 : 1;

  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <h1>{done ? "노래가 완성됐어요!" : stopped ? "제작이 잠시 멈췄어요" : "노래를 만들고 있어요"}</h1>
        <p>
          주문번호 {order.orderNo} · 이 창을 닫아도 제작은 계속되고, 완성된 노래는 &lsquo;내 노래&rsquo;에서 들을 수 있어요.
        </p>
      </div>

      {/* 만드는 동안은 캐릭터가 노래하고, 완성되면 멈춘 채 축하한다. */}
      <Mascot size={160} live={!done && !stopped} className="orders-mascot" />

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
            : "노래 제작이 잠시 멈춰 있어요. 운영자가 확인해 다시 만들어 드려요. 급하시면 카카오톡 채널로 문의해 주세요."}
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
