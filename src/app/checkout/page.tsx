"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import EmptyState from "@/components/EmptyState";
import { useOrder } from "@/components/useOrder";
import { PRICE, callName, formatWon, genreLabel, reasonLabel, relationshipLabel } from "@/lib/draft";
import { VOCALS, labelOf } from "@/lib/options";

export default function CheckoutPage() {
  const router = useRouter();
  const [order, setOrder] = useOrder();
  const [agree, setAgree] = useState(false);

  if (!order) return null;
  if (!order.lyrics || !order.confirmedAt) {
    return <EmptyState title="확정한 가사가 없어요" desc="가사를 확인하고 확정해 주세요." href="/draft" cta="가사 확인하기" />;
  }

  const d = order.draft;

  const pay = () => {
    // 실제 서비스에서는 PG 결제 후 서버가 결과를 검증해야 paid가 된다.
    const orderNo = `OY-${Date.now().toString(36).toUpperCase()}`;
    setOrder({ ...order, paidAt: new Date().toISOString(), orderNo });
    router.push("/orders");
  };

  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <h1>주문 확인</h1>
        <p>결제하면 확정한 가사로 노래 제작을 시작해요.</p>
      </div>

      <div className="card stack" style={{ marginTop: 20 }}>
        <div>
          <strong>{order.lyrics.title}</strong>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {relationshipLabel(d)}({callName(d)})에게 · {reasonLabel(d)} · {genreLabel(d)} · {labelOf(VOCALS, d.vocal)}
          </p>
          <Link href="/draft" className="link-btn" style={{ display: "inline-block", marginTop: 6 }}>
            가사 다시 보기
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

      <button type="button" className="btn btn-block" disabled={!agree} onClick={pay}>
        {formatWon(PRICE)} 결제하고 제작 시작
      </button>
    </div>
  );
}
