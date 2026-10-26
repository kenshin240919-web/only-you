"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import EmptyState from "@/components/EmptyState";
import PhoneField, { isPhone } from "@/components/PhoneField";
import { closePayWindow, goPay, openPayWindow } from "@/components/payWindow";
import { currentSource } from "@/components/SourceTracker";
import { usePaymentProvider } from "@/components/usePaymentProvider";
import { useOrder } from "@/components/useOrder";
import { callName, genreLabel, reasonLabel, relationshipLabel, songTitle } from "@/lib/draft";
import { VOCALS, labelOf } from "@/lib/options";
import { ALL_IN_ONE_LIST, type Item, MAX_REVISIONS, PAID_REVISIONS, PRICES, formatWon, priceOf } from "@/lib/pricing";

const ADDONS: { item: "mp3" | "card"; label: string; desc: string }[] = [
  { item: "mp3", label: "MP3 다운로드", desc: "휴대폰·컴퓨터에 저장해 언제든 들어요" },
  { item: "card", label: "가사 카드", desc: "가사를 예쁘게 담은 선물용 이미지" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [order, setOrder] = useOrder();
  const provider = usePaymentProvider();
  // 올인원(노래 + MP3 + 가사 카드)을 기본으로 고른다.
  const [addons, setAddons] = useState<("mp3" | "card")[]>(["mp3", "card"]);
  const [agree, setAgree] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  // 후기 혜택으로 받은 무료 노래 쿠폰(노래 듣기만). 확인되면 추가 상품 없이 0원으로 만든다.
  const [coupon, setCoupon] = useState("");
  const [couponOk, setCouponOk] = useState(false);
  const [couponMsg, setCouponMsg] = useState("");

  if (!order) return null;
  if (!order.draft.agreeRequired || !order.draft.email) {
    return <EmptyState title="아직 쓴 이야기가 없어요" desc="이야기를 먼저 써 주세요." href="/create" cta="이야기 쓰기" />;
  }
  // 이미 주문한 내역이 있으면 다시 결제하지 않도록(중복 과금) 주문 상태 화면으로 보낸다.
  // 결제를 마치지 못한 주문은 그 화면에서 "결제 다시 하기"로 새로 주문한다.
  if (order.orderId) {
    return <EmptyState title="이미 주문한 내역이 있어요" desc="결제와 제작 상태를 확인해 주세요." href="/orders" cta="주문 상태 보기" />;
  }

  const d = order.draft;
  const items: Item[] = couponOk ? ["song"] : ["song", ...addons];
  const total = couponOk ? 0 : priceOf(items);
  const allInOne = !couponOk && addons.length === 2;

  const checkCoupon = async () => {
    setCouponMsg("확인 중…");
    const r = (await fetch(`/api/coupons?code=${encodeURIComponent(coupon)}`)
      .then((x) => x.json())
      .catch(() => ({ valid: false }))) as { valid: boolean; reason?: string };
    setCouponOk(r.valid);
    setCouponMsg(
      r.valid
        ? "쿠폰이 확인됐어요. 노래 1곡을 결제 없이 만들어요(MP3·가사 카드 제외)."
        : r.reason === "used"
          ? "이미 사용한 쿠폰이에요."
          : r.reason === "expired"
            ? "기간이 지난 쿠폰이에요."
            : "쿠폰 번호를 다시 확인해 주세요.",
    );
  };
  const toggle = (a: "mp3" | "card") => setAddons((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  const pay = async () => {
    // 페이앱이면 서버가 결제 대기 주문과 결제창 주소를 만들고, 결제 완료는 페이앱 알림으로 서버가 확인한다.
    setPaying(true);
    setError("");
    const win = provider === "payapp" && !couponOk ? openPayWindow() : null;
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draft: order.draft, addons: couponOk ? [] : addons, phone, src: currentSource(), coupon: couponOk ? coupon : undefined }),
      });
      if (!res.ok) {
        const err = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "";
        if (err.startsWith("coupon_")) {
          closePayWindow(win);
          setCouponOk(false);
          setCouponMsg("쿠폰을 쓸 수 없어요. 이미 사용했거나 기간이 지났을 수 있어요.");
          setPaying(false);
          return;
        }
        throw new Error(String(res.status));
      }
      const saved = (await res.json()) as {
        id: string;
        ownerToken: string;
        giftToken: string;
        orderNo: string;
        paidAt: string | null;
        payurl: string | null;
      };
      setOrder({
        ...order,
        paidAt: saved.paidAt,
        orderNo: saved.orderNo,
        orderId: saved.id,
        ownerToken: saved.ownerToken,
        giftToken: saved.giftToken,
      });
      // 결제창을 새 창으로 열었으면 이 창은 주문 상태 화면에서 결제 완료를 기다린다.
      if (saved.payurl && !goPay(win, saved.payurl)) return;
      closePayWindow(saved.payurl ? null : win);
      router.push("/orders");
    } catch {
      closePayWindow(win);
      setError("결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setPaying(false);
    }
  };

  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <h1>주문 확인</h1>
        <p>결제하면 입력한 이야기로 AI가 가사와 노래를 함께 만들어요. 보통 1분 안에 완성돼요.</p>
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
            <span>
              <strong>맞춤 노래 1곡</strong>
              <br />
              <small className="muted">약 2분 30초 · 무제한 듣기 · 가사 보기 · 선물 링크 · 무료 수정 1회</small>
            </span>
            <span>{formatWon(PRICES.song)}</span>
          </div>
          <p className="muted" style={{ margin: "14px 0 6px", fontSize: 14 }}>
            함께 받을 것을 고르세요
          </p>
          {ADDONS.map((a) => (
            <label key={a.item} className="checkbox addon-row">
              <input
                id={`addon-${a.item}`}
                type="checkbox"
                checked={!couponOk && addons.includes(a.item)}
                disabled={couponOk}
                onChange={() => toggle(a.item)}
              />
              <span className="row-between" style={{ flex: 1, padding: 0 }}>
                <span>
                  {a.label}
                  <br />
                  <small className="muted">{a.desc}</small>
                </span>
                <span>+{formatWon(PRICES[a.item])}</span>
              </span>
            </label>
          ))}
          {allInOne && (
            <>
              <div className="row-between">
                <span>
                  추가 수정 {PAID_REVISIONS}회
                  <br />
                  <small className="muted">올인원은 수정 {MAX_REVISIONS}회 모두 무료</small>
                </span>
                <span>+{formatWon(PAID_REVISIONS * PRICES.revision)}</span>
              </div>
              <div className="row-between bundle-note">
                <span>올인원 할인</span>
                <span>-{formatWon(ALL_IN_ONE_LIST - PRICES.bundle)}</span>
              </div>
            </>
          )}
          {couponOk && (
            <div className="row-between bundle-note">
              <span>무료 노래 쿠폰</span>
              <span>-{formatWon(PRICES.song)}</span>
            </div>
          )}
          <div className="row-between total">
            <span>{allInOne ? "올인원 결제금액" : "최종 결제금액"}</span>
            <span>{formatWon(total)}</span>
          </div>
          {!allInOne && !couponOk && (
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
              MP3와 가사 카드는 노래를 들어 본 뒤 &lsquo;내 노래&rsquo;에서도 살 수 있어요.
            </p>
          )}
        </div>
      </div>

      <label className="checkbox" style={{ marginTop: 20 }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          <strong>(필수)</strong> 맞춤 제작 상품이라 제작이 시작된 뒤에는 단순 변심 환불이 어렵다는 점과, 노래가 AI로
          만들어진다는 점을 확인했습니다. (<Link href="/refund">환불 정책</Link>)
        </span>
      </label>

      <details className="coupon-box" style={{ marginTop: 16 }}>
        <summary>무료 노래 쿠폰이 있으세요?</summary>
        <div className="coupon-row">
          <input
            id="coupon"
            className="input"
            placeholder="SONG-XXXX-XXXX"
            value={coupon}
            autoCapitalize="characters"
            onChange={(e) => {
              setCoupon(e.target.value);
              setCouponOk(false);
              setCouponMsg("");
            }}
          />
          <button type="button" className="btn-ghost" disabled={!coupon.trim()} onClick={checkCoupon}>
            적용
          </button>
        </div>
        {couponMsg && <small className={couponOk ? "muted" : "field-error"}>{couponMsg}</small>}
      </details>

      {provider === "payapp" && !couponOk && (
        <div style={{ marginTop: 16 }}>
          <PhoneField id="phone" value={phone} onChange={setPhone} />
        </div>
      )}
      {provider === "unavailable" && !couponOk && (
        <div className="notice">지금은 결제를 받을 수 없어요. 잠시 후 다시 시도해 주세요.</div>
      )}
      {provider === "mock" && !couponOk && (
        <div className="notice">시제품이라 실제 결제는 이루어지지 않습니다. 버튼을 누르면 결제가 완료된 것처럼 진행돼요.</div>
      )}

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn btn-block"
        disabled={
          !agree || paying || (!couponOk && (!provider || provider === "unavailable" || (provider === "payapp" && !isPhone(phone))))
        }
        onClick={pay}
      >
        {paying ? "결제 준비 중…" : couponOk ? "쿠폰으로 제작 시작" : `${formatWon(total)} 결제하고 제작 시작`}
      </button>
    </div>
  );
}
