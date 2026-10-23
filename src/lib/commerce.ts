import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type OrderRow, getDb, randomToken } from "./db";
import type { Draft, Lyrics } from "./draft";
import { type RevisionRequest, reviseSong, startSong } from "./music";
import { paymentProvider, requestPayment } from "./payapp";
import { type Item, goodName, priceOf } from "./pricing";

// 주문 하나에 여러 번 결제한다(처음 주문, MP3·가사 카드 추가, 유료 수정).
// 페이앱이 켜져 있으면 결제 대기로 만들고 결제창 주소를 돌려주며, 결제 완료 알림에서 applyPaid가 상품을 적용한다.
// 꺼져 있으면 시제품 모의 결제로 바로 결제 완료 처리한다.

export type PurchaseResult = { purchaseId: string; payurl: string | null } | null;

export async function createPurchase(
  orderId: string,
  items: Item[],
  phone: string,
  origin: string,
  back: "orders" | "songs",
  id = `pur_${randomToken(16)}`,
): Promise<PurchaseResult> {
  const { env } = await getCloudflareContext({ async: true });
  const provider = paymentProvider(env);
  if (provider === "unavailable") return null;
  const payapp = provider === "payapp";
  const db = await getDb();
  const amount = priceOf(items);
  const now = new Date().toISOString();
  await db
    .prepare("INSERT INTO purchases (id, order_id, items, amount, provider, status, created_at, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, orderId, JSON.stringify(items), amount, payapp ? "payapp" : "mock", payapp ? "ready" : "paid", now, payapp ? null : now)
    .run();

  if (!payapp) {
    await applyPaid(id);
    return { purchaseId: id, payurl: null };
  }
  const pay = await requestPayment(env, { purchaseId: id, amount, goodname: goodName(items), phone, origin, back });
  if (!pay) {
    await db.prepare("DELETE FROM purchases WHERE id = ?").bind(id).run();
    return null;
  }
  await db.prepare("UPDATE purchases SET provider_ref = ? WHERE id = ?").bind(pay.mulNo, id).run();
  return { purchaseId: id, payurl: pay.payurl };
}

/** 결제가 끝난 구매의 상품을 적용한다. 노래는 제작을 시작하고, 유료 수정은 연결된 수정 요청을 시작한다. */
export async function applyPaid(purchaseId: string): Promise<void> {
  const db = await getDb();
  const p = await db.prepare("SELECT order_id, items FROM purchases WHERE id = ?").bind(purchaseId).first<{ order_id: string; items: string }>();
  if (!p) return;
  const items = JSON.parse(p.items) as Item[];
  const order = await db.prepare("SELECT draft_json, lyrics_json FROM orders WHERE id = ?").bind(p.order_id).first<Pick<OrderRow, "draft_json" | "lyrics_json">>();
  if (!order) return;
  const draft = JSON.parse(order.draft_json) as Draft;
  const title = (JSON.parse(order.lyrics_json) as Lyrics).title;
  if (items.includes("song")) await startSong(p.order_id, draft, title);
  if (items.includes("revision")) {
    const rev = await db.prepare("SELECT id FROM revisions WHERE purchase_id = ? AND status IN ('awaiting_payment', 'cancelled')").bind(purchaseId).first<{ id: string }>();
    if (rev) await startRevision(p.order_id, rev.id, draft, title);
  }
}

/** 수정 요청을 시작 상태로 바꾸고 노래를 다시 만든다. 버전 번호는 시작된 수정 수로 정한다. */
export async function startRevision(orderId: string, revisionId: string, draft: Draft, title: string): Promise<void> {
  const db = await getDb();
  const rev = await db.prepare("SELECT request_json FROM revisions WHERE id = ?").bind(revisionId).first<{ request_json: string }>();
  if (!rev) return;
  await db.prepare("UPDATE revisions SET status = 'started' WHERE id = ?").bind(revisionId).run();
  const n = await db.prepare("SELECT count(*) AS n FROM revisions WHERE order_id = ? AND status = 'started'").bind(orderId).first<{ n: number }>();
  await reviseSong(orderId, draft, title, `r${n?.n ?? 1}`, JSON.parse(rev.request_json) as RevisionRequest);
}
