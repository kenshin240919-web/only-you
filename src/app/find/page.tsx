"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOrder } from "@/components/useOrder";
import { type Draft, EMPTY_DRAFT } from "@/lib/draft";

// 다른 기기에서 주문했거나 브라우저 저장소를 지웠을 때 주문번호와 이메일로 '내 노래'를 다시 연다.
export default function FindPage() {
  const router = useRouter();
  const [order, setOrder] = useOrder();
  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orders/find", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderNo, email }),
      });
      if (res.status === 429) throw new Error("잠시 뒤에 다시 시도해 주세요. 짧은 시간에 여러 번 틀렸어요.");
      if (!res.ok) throw new Error("주문을 찾지 못했어요. 주문번호와 주문할 때 쓴 이메일을 확인해 주세요.");
      const found = (await res.json()) as { id: string; ownerToken: string; giftToken: string; orderNo: string; paidAt: string; draft: Draft };
      setOrder({
        draft: { ...EMPTY_DRAFT, ...found.draft },
        paidAt: found.paidAt,
        orderNo: found.orderNo,
        orderId: found.id,
        ownerToken: found.ownerToken,
        giftToken: found.giftToken,
      });
      router.push("/songs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "주문을 찾지 못했어요.");
      setBusy(false);
    }
  };

  const hasOther = Boolean(order?.orderId);

  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <h1>주문 찾기</h1>
        <p>다른 기기에서 주문하셨거나 이 기기에서 노래가 보이지 않으면, 주문번호와 주문할 때 쓴 이메일로 다시 열 수 있어요.</p>
      </div>
      <form className="card stack" style={{ marginTop: 20 }} onSubmit={find}>
        <label className="field" style={{ margin: 0 }}>
          <span className="field-label">주문번호</span>
          <input
            id="find-order-no"
            className="input"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="예: OY-MVG4SQWB-7K2Q"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
          />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span className="field-label">이메일</span>
          <input id="find-email" className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {hasOther && (
          <p className="notice" style={{ margin: 0 }}>
            이 기기에서 보던 다른 주문은 목록에서 바뀌어요. 그 주문도 주문번호로 언제든 다시 찾을 수 있어요.
          </p>
        )}
        {error && (
          <p className="field-error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-block" disabled={busy || !orderNo.trim() || !email.trim()}>
          {busy ? "찾는 중…" : "내 노래 열기"}
        </button>
        <small className="muted">주문번호는 결제 후 주문 상태 화면과 &lsquo;내 노래&rsquo; 맨 위에 있어요. 찾을 수 없으면 사이트 아래 연락처로 문의해 주세요.</small>
      </form>
    </div>
  );
}
