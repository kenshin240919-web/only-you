import "server-only";
import { createFreePurchase } from "./commerce";
import { getDb, getPurchases, ownership, randomToken } from "./db";
import { isAllInOne } from "./pricing";

// 후기 이벤트(2026-10-26 결정). 솔직한 후기면 내용과 관계없이 지급한다.
// - 반응 영상: 노래만 산 주문(오픈 기념 무료 포함)은 MP3 + 가사 카드, 올인원 주문은 다음 노래 1곡 무료 쿠폰(노래 듣기만)
// - 글·사진 후기: 가사 카드
export type RewardKind = "video" | "text";
export type RewardResult =
  | { ok: true; benefit: "addons" | "card" | "coupon"; couponCode?: string }
  | { ok: false; reason: "already" | "not_paid" | "nothing" };

export const COUPON_DAYS = 365;

// 헷갈리는 글자(0·O·1·I)를 뺀 대문자와 숫자로 만든 쿠폰 번호. 예: SONG-7KQ2-XM4P
const CODE = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function couponCode(): string {
  const part = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => CODE[b % CODE.length]).join("");
  return `SONG-${part()}-${part()}`;
}

export const normalizeCoupon = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase().replace(/\s+/g, "") : "");

export async function getRewards(orderId: string) {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT kind, benefit, coupon_code, created_at FROM rewards WHERE order_id = ? ORDER BY created_at")
    .bind(orderId)
    .all<{ kind: RewardKind; benefit: string; coupon_code: string | null; created_at: string }>();
  return results;
}

/** 관리자가 후기를 확인한 뒤 혜택을 준다. 같은 주문 · 같은 종류는 한 번만. */
export async function grantReward(orderId: string, kind: RewardKind): Promise<RewardResult> {
  const db = await getDb();
  const { payment, owned, bought } = ownership(await getPurchases(orderId));
  if (payment !== "paid") return { ok: false, reason: "not_paid" };

  let benefit: "addons" | "card" | "coupon";
  if (kind === "video") benefit = isAllInOne(bought) ? "coupon" : "addons";
  else benefit = "card";
  if (benefit === "card" && owned.includes("card")) return { ok: false, reason: "nothing" };

  const now = new Date().toISOString();
  const code = benefit === "coupon" ? couponCode() : null;
  // 기록을 먼저 남겨 두 번 누르거나 동시에 눌러도 한 번만 지급되게 한다.
  const claimed = await db
    .prepare("INSERT INTO rewards (order_id, kind, benefit, coupon_code, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING")
    .bind(orderId, kind, benefit, code, now)
    .run();
  if (!claimed.meta.changes) return { ok: false, reason: "already" };

  if (benefit === "coupon") {
    const expires = new Date(Date.now() + COUPON_DAYS * 86400 * 1000).toISOString();
    await db
      .prepare("INSERT INTO coupons (code, kind, source_order_id, created_at, expires_at) VALUES (?, 'free_song', ?, ?, ?)")
      .bind(code, orderId, now, expires)
      .run();
    return { ok: true, benefit, couponCode: code! };
  }
  // 이미 가진 상품은 빼고 준다(예: MP3만 샀던 주문은 가사 카드만).
  const items = (benefit === "addons" ? (["mp3", "card"] as const) : (["card"] as const)).filter((i) => !owned.includes(i));
  if (items.length) await createFreePurchase(orderId, [...items], "reward");
  return { ok: true, benefit };
}

export type CouponCheck = { valid: true } | { valid: false; reason: "not_found" | "used" | "expired" };

export async function checkCoupon(code: string): Promise<CouponCheck> {
  if (!code) return { valid: false, reason: "not_found" };
  const db = await getDb();
  const c = await db.prepare("SELECT expires_at, used_order_id FROM coupons WHERE code = ?").bind(code).first<{ expires_at: string; used_order_id: string | null }>();
  if (!c) return { valid: false, reason: "not_found" };
  if (c.used_order_id) return { valid: false, reason: "used" };
  if (c.expires_at < new Date().toISOString()) return { valid: false, reason: "expired" };
  return { valid: true };
}

/** 쿠폰을 이 주문에 쓴다. 동시에 두 주문이 같은 쿠폰을 써도 한쪽만 성공한다. */
export async function useCoupon(code: string, orderId: string): Promise<boolean> {
  const db = await getDb();
  const now = new Date().toISOString();
  const r = await db
    .prepare("UPDATE coupons SET used_order_id = ?, used_at = ? WHERE code = ? AND used_order_id IS NULL AND expires_at >= ?")
    .bind(orderId, now, code, now)
    .run();
  return r.meta.changes === 1;
}

export const newReviewId = () => `rv_${randomToken(12)}`;

/** 노래 결제가 취소되면 그 주문의 후기 혜택도 거둔다(지급한 MP3·가사 카드 취소, 쓰지 않은 쿠폰 만료). 함께 실행할 쿼리를 돌려준다. */
export function revokeRewardsStatements(db: D1Database, orderId: string): D1PreparedStatement[] {
  return [
    db.prepare("UPDATE purchases SET status = 'cancelled' WHERE order_id = ? AND provider = 'reward' AND status = 'paid'").bind(orderId),
    db.prepare("UPDATE coupons SET expires_at = ? WHERE source_order_id = ? AND used_order_id IS NULL").bind(new Date().toISOString(), orderId),
  ];
}
