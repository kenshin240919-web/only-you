import "server-only";
import { getDb } from "./db";

// 오픈 기념 선착순 무료(2026-10-26 결정): 노래(듣기 · 선물 링크 · 수정 1회)를 0원으로.
// 반응 영상 후기를 보내면 후기 혜택으로 MP3 + 가사 카드를 연다(그냥 받아만 가는 것을 줄이려고 올인원에서 바꿈).
// 관리자가 켜고 끄며 인원을 정한다. 인원이 차면 자동으로 받지 않는다. 2차를 하려면 인원을 늘리고 다시 켠다.
export const CAMPAIGN = "open2026";
export const DEFAULT_LIMIT = 5;

export type PromoStatus = { enabled: boolean; limit: number; used: number; left: number; active: boolean };

export async function promoStatus(): Promise<PromoStatus> {
  const db = await getDb();
  const [{ results: rows }, count] = await Promise.all([
    db.prepare("SELECT key, value FROM settings WHERE key IN ('promo_enabled', 'promo_limit')").all<{ key: string; value: string }>(),
    db.prepare("SELECT count(*) n FROM promo_claims WHERE campaign = ?").bind(CAMPAIGN).first<{ n: number }>(),
  ]);
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  const enabled = get("promo_enabled") === "1";
  const limit = Number(get("promo_limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
  const used = count?.n ?? 0;
  const left = Math.max(0, limit - used);
  return { enabled, limit, used, left, active: enabled && left > 0 };
}

export async function setPromo(enabled: boolean, limit: number): Promise<void> {
  const db = await getDb();
  const up = "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value";
  await db.batch([db.prepare(up).bind("promo_enabled", enabled ? "1" : "0"), db.prepare(up).bind("promo_limit", String(limit))]);
}

/**
 * 무료 자리 하나를 이 주문에 잡는다. 켜져 있고 자리가 남았고 같은 이메일이 처음일 때만 성공한다.
 * 한 문장으로 확인과 기록을 함께 해서, 동시에 여러 명이 눌러도 인원을 넘지 않는다.
 */
export async function claimPromo(email: string, orderId: string): Promise<"ok" | "closed" | "used"> {
  const db = await getDb();
  const key = email.trim().toLowerCase();
  const dup = await db.prepare("SELECT 1 FROM promo_claims WHERE campaign = ? AND email = ?").bind(CAMPAIGN, key).first();
  if (dup) return "used";
  const r = await db
    .prepare(
      `INSERT INTO promo_claims (campaign, email, order_id, created_at)
       SELECT ?1, ?2, ?3, ?4
       WHERE (SELECT value FROM settings WHERE key = 'promo_enabled') = '1'
         AND (SELECT count(*) FROM promo_claims WHERE campaign = ?1) < coalesce((SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'promo_limit'), ?5)
       ON CONFLICT DO NOTHING`,
    )
    .bind(CAMPAIGN, key, orderId, new Date().toISOString(), DEFAULT_LIMIT)
    .run();
  return r.meta.changes === 1 ? "ok" : "closed";
}

export async function listPromoClaims() {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT c.created_at, o.order_no, o.id order_id,
         EXISTS (SELECT 1 FROM rewards r WHERE r.order_id = o.id AND r.kind = 'video') video
       FROM promo_claims c JOIN orders o ON o.id = c.order_id
       WHERE c.campaign = ? ORDER BY c.created_at`,
    )
    .bind(CAMPAIGN)
    .all<{ created_at: string; order_no: string; order_id: string; video: number }>();
  return results;
}
