import { getCloudflareContext } from "@opennextjs/cloudflare";
import { applyPaid } from "@/lib/commerce";
import { type PurchaseRow, getDb, purchaseItems } from "@/lib/db";
import { CANCEL_STATES, PAID_STATE, verifyFeedback } from "@/lib/payapp";
import { revokeRewardsStatements } from "@/lib/rewards";

const ok = () => new Response("SUCCESS");

// 페이앱 결제 알림(feedbackurl). 결제 완료(4)면 paid로 바꾸고 상품을 적용(노래 제작·수정 시작)하며,
// 취소·환불(8·9·32·64)이면 cancelled로 바꾼다. 처음 주문이 취소되면 선물 링크도 끈다. 같은 알림이 여러 번 와도 결과는 같다.
export async function POST(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const f = new URLSearchParams(await req.text());
  if (!verifyFeedback(env, f)) {
    console.error("payapp-feedback: 연동값 불일치");
    return new Response("FAIL", { status: 403 });
  }

  const db = await getDb();
  const purchaseId = f.get("var1") ?? "";
  const p = await db.prepare("SELECT * FROM purchases WHERE id = ?").bind(purchaseId).first<PurchaseRow>();
  if (!p || p.provider !== "payapp" || p.provider_ref !== f.get("mul_no") || Number(f.get("price")) !== p.amount) {
    console.error("payapp-feedback: 주문 불일치", purchaseId, f.get("mul_no"));
    return ok(); // 우리 주문이 아니면 무시 (재전송 방지)
  }

  const state = f.get("pay_state") ?? "";
  if (state === PAID_STATE) {
    const updated = await db
      .prepare("UPDATE purchases SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'ready'")
      .bind(new Date().toISOString(), purchaseId)
      .run();
    if (updated.meta.changes) await applyPaid(purchaseId);
  } else if (CANCEL_STATES.includes(state)) {
    const stmts = [db.prepare("UPDATE purchases SET status = 'cancelled' WHERE id = ?").bind(purchaseId)];
    if (purchaseItems(p).includes("song")) {
      stmts.push(db.prepare("UPDATE orders SET gift_enabled = 0 WHERE id = ?").bind(p.order_id), ...revokeRewardsStatements(db, p.order_id));
    }
    if (purchaseItems(p).includes("revision")) {
      stmts.push(db.prepare("UPDATE revisions SET status = 'cancelled' WHERE purchase_id = ? AND status = 'awaiting_payment'").bind(purchaseId));
    }
    await db.batch(stmts);
  }
  return ok();
}
