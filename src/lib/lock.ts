import "server-only";
import { type PurchaseRow, getDb, getPurchases, purchaseItems } from "./db";
import { CAMPAIGN } from "./promo";

// 노래 듣기 정지(2026-10-26 결정).
// - 오픈 기념 무료 주문은 신청 후 7일 안에 반응 영상 후기(혜택 지급)가 없으면 자동으로 정지한다.
// - 관리자는 어느 주문이든 직접 정지하거나(locked) 기한과 관계없이 다시 열 수 있다(open).
// - 기한이 지나 정지된 노래는 노래 값(9,900원)을 결제하면 다시 열린다. 관리자가 정지한 노래는 관리자만 다시 연다.
// 정지되면 주문자 음원(MP3 포함)과 선물 링크가 모두 막힌다. 관리자 화면에서는 계속 들을 수 있다.
export const PROMO_DAYS = 7;

export type LockInfo = { locked: boolean; reason: "expired" | "admin" | null; deadline: string | null };

/** 돈을 내고 산 노래 결제가 있는지(오픈 기념 무료 · 후기 혜택 · 쿠폰이 아닌). */
const paidSong = (purchases: PurchaseRow[]) =>
  purchases.some((p) => p.status === "paid" && (p.provider === "payapp" || p.provider === "mock") && purchaseItems(p).includes("song"));

export async function songLock(orderId: string, purchases?: PurchaseRow[]): Promise<LockInfo> {
  const db = await getDb();
  const [override, claim, video, list] = await Promise.all([
    db.prepare("SELECT state FROM song_locks WHERE order_id = ?").bind(orderId).first<{ state: string }>(),
    db.prepare("SELECT created_at FROM promo_claims WHERE campaign = ? AND order_id = ?").bind(CAMPAIGN, orderId).first<{ created_at: string }>(),
    db.prepare("SELECT 1 FROM rewards WHERE order_id = ? AND kind = 'video'").bind(orderId).first(),
    purchases ? Promise.resolve(purchases) : getPurchases(orderId),
  ]);
  if (override?.state === "locked") return { locked: true, reason: "admin", deadline: null };
  // 오픈 기념 무료이고 아직 영상 후기·노래 결제·관리자 열기가 없을 때만 기한이 있다.
  const deadline =
    claim && !video && !paidSong(list) && override?.state !== "open"
      ? new Date(new Date(claim.created_at).getTime() + PROMO_DAYS * 86400 * 1000).toISOString()
      : null;
  const expired = deadline !== null && deadline < new Date().toISOString();
  return { locked: expired, reason: expired ? "expired" : null, deadline };
}

export async function setSongLock(orderId: string, state: "locked" | "open" | null): Promise<void> {
  const db = await getDb();
  if (state === null) await db.prepare("DELETE FROM song_locks WHERE order_id = ?").bind(orderId).run();
  else
    await db
      .prepare("INSERT INTO song_locks (order_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at")
      .bind(orderId, state, new Date().toISOString())
      .run();
}
