import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type OrderRow, getDb, getPayment } from "@/lib/db";
import type { Draft, Lyrics } from "@/lib/draft";
import { startSong } from "@/lib/music";
import { CANCEL_STATES, PAID_STATE, verifyFeedback } from "@/lib/payapp";

const ok = () => new Response("SUCCESS");

// 페이앱 결제 알림(feedbackurl). 결제 완료(4)면 paid로 바꾸고 노래 제작을 시작하고,
// 취소·환불(8·9·32·64)이면 cancelled로 바꾸고 선물 링크를 끈다. 같은 알림이 여러 번 와도 결과는 같다.
export async function POST(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const f = new URLSearchParams(await req.text());
  if (!verifyFeedback(env, f)) {
    console.error("payapp-feedback: 연동값 불일치");
    return new Response("FAIL", { status: 403 });
  }

  const orderId = f.get("var1") ?? "";
  const payment = await getPayment(orderId);
  if (!payment || payment.provider !== "payapp" || payment.provider_ref !== f.get("mul_no") || Number(f.get("price")) !== payment.amount) {
    console.error("payapp-feedback: 주문 불일치", orderId, f.get("mul_no"));
    return ok(); // 우리 주문이 아니면 무시 (재전송 방지)
  }

  const db = await getDb();
  const state = f.get("pay_state") ?? "";
  if (state === PAID_STATE) {
    const updated = await db
      .prepare("UPDATE payments SET status = 'paid', paid_at = ? WHERE order_id = ? AND status = 'ready'")
      .bind(new Date().toISOString(), orderId)
      .run();
    if (updated.meta.changes) {
      const order = await db.prepare("SELECT draft_json, lyrics_json FROM orders WHERE id = ?").bind(orderId).first<Pick<OrderRow, "draft_json" | "lyrics_json">>();
      if (order) await startSong(orderId, JSON.parse(order.draft_json) as Draft, (JSON.parse(order.lyrics_json) as Lyrics).title);
    }
  } else if (CANCEL_STATES.includes(state)) {
    await db.batch([
      db.prepare("UPDATE payments SET status = 'cancelled' WHERE order_id = ?").bind(orderId),
      db.prepare("UPDATE orders SET gift_enabled = 0 WHERE id = ?").bind(orderId),
    ]);
  }
  return ok();
}
