import "server-only";
import { getDb } from "./db";
import { songLock } from "./lock";
import { mailPromoReminder } from "./mail";
import { CAMPAIGN } from "./promo";

// 오픈 기념 무료 주문의 반응 영상 기한 안내 메일(2026-11-05 결정). 매일 오전 10시(한국 시간)에 Cron이 부른다(worker.ts).
// - d3: 기한이 3.5일 안으로 남았을 때 "노래는 잘 전하셨나요?"
// - d1: 기한이 30시간 안으로 남았을 때 "내일까지 보내 주세요"
// 주문 · 종류마다 한 번만 보낸다(reminders 표에 먼저 기록). 영상 혜택을 받았거나 정지 · 다시 열기 · 결제로 기한이 없어진 주문은 보내지 않는다.
const HOUR = 3600 * 1000;

export async function sendPromoReminders(env: CloudflareEnv): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const { results } = await db
    .prepare(
      `SELECT c.order_id, s.finished_at FROM promo_claims c JOIN songs s ON s.order_id = c.order_id
       WHERE c.campaign = ? AND s.status = 'ready' AND c.created_at > ?`,
    )
    .bind(CAMPAIGN, new Date(now - 8 * 24 * HOUR).toISOString())
    .all<{ order_id: string; finished_at: string | null }>();

  let sent = 0;
  for (const r of results) {
    // 방금 완성 메일을 받은 주문에는 바로 또 보내지 않는다.
    if (r.finished_at && now - new Date(r.finished_at).getTime() < 12 * HOUR) continue;
    const lock = await songLock(r.order_id);
    if (lock.locked || !lock.deadline) continue;
    const left = new Date(lock.deadline).getTime() - now;
    const stage = left <= 30 * HOUR ? "d1" : left <= 84 * HOUR ? "d3" : null;
    if (!stage) continue;
    const claimed = await db
      .prepare("INSERT INTO reminders (order_id, kind, sent_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING")
      .bind(r.order_id, `promo_${stage}`, new Date(now).toISOString())
      .run();
    if (!claimed.meta.changes) continue;
    await mailPromoReminder(env, r.order_id, stage, lock.deadline);
    sent++;
  }
  return sent;
}
