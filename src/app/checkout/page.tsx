"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import EmptyState from "@/components/EmptyState";
import { useOrder } from "@/components/useOrder";
import { PRICE, callName, formatWon, genreLabel, reasonLabel, relationshipLabel, songTitle } from "@/lib/draft";
import { VOCALS, labelOf } from "@/lib/options";

export default function CheckoutPage() {
  const router = useRouter();
  const [order, setOrder] = useOrder();
  const [agree, setAgree] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  if (!order) return null;
  if (!order.draft.agreeRequired || !order.draft.email) {
    return <EmptyState title="아직 쓴 이야기가 없어요" desc="이야기를 먼저 써 주세요." href="/create" cta="이야기 쓰기" />;
  }
  // 이미 결제한 주문을 다시 결제하면 노래가 한 번 더 만들어지므로(중복 과금) 막는다.
  if (order.paidAt) {
    return <EmptyState title="이미 결제한 주문이에요" desc="제작 상태를 확인해 주세요." href="/orders" cta="주문 상태 보기" />;
  }

  const d = order.draft;

  const pay = async () => {
    // 실제 서비스에서는 PG 결제 후 서버가 결과를 검증해야 paid가 된다.
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft: order.draft }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const saved = (await res.json()) as { id: string; ownerToken: string; giftToken: string; orderNo: string; paidAt: string };
      setOrder({
        ...order,
        paidAt: saved.paidAt,
        orderNo: saved.orderNo,
        orderId: saved.id,
        ownerToken: saved.ownerToken,
        giftToken: saved.giftToken,
      });
      router.push("/orders");
    } catch {
      setError("주문을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setPaying(false);
    }
  };

  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <h1>주문 확인</h1>
        <p>결제하면 입력한 이야기로 AI가 가사와 노래를 함께 만들어요.</p>
      </div>

      <div className="card stack" style={{ marginTop: 20 }}>
        <div>
          <strong>{songTitle(d)}</strong>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {relationshipLabel(d)}({callName(d)})에게 · {reasonLabel(d)} · {genreLabel(d)} · {labelOf(VOCALS, d.vocal)}
          </p>
          <Link href="/create" className="link-btn" style={{ display: "inline-block", marginTop: 6 }}>
            이야기 고치기
          </Link>
        </div>
        <div>
          <div className="row-between">
            <span>맞춤 노래 1곡 (약 2분 30초 목표)</span>
            <span>{formatWon(PRICE)}</span>
          </div>
          <div className="row-between muted">
            <span>MP3 다운로드</span>
            <span>포함</span>
          </div>
          <div className="row-between muted">
            <span>선물 페이지 링크</span>
            <span>포함</span>
          </div>
          <div className="row-between muted">
            <span>원주문 범위 재제작 1회</span>
            <span>포함</span>
          </div>
          <div className="row-between total">
            <span>최종 결제금액</span>
            <span>{formatWon(PRICE)}</span>
          </div>
        </div>
      </div>

      <label className="checkbox" style={{ marginTop: 20 }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          <strong>(필수)</strong> 맞춤 제작 상품이라 제작이 시작된 뒤에는 단순 변심 환불이 어렵다는 점과, 노래가 AI로
          만들어진다는 점을 확인했습니다.
        </span>
      </label>

      <div className="notice">시제품이라 실제 결제는 이루어지지 않습니다. 버튼을 누르면 결제가 완료된 것처럼 진행돼요.</div>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-block" disabled={!agree || paying} onClick={pay}>
        {paying ? "주문 저장 중…" : `${formatWon(PRICE)} 결제하고 제작 시작`}
      </button>
    </div>
  );
}
