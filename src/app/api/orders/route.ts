import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getDb, hashToken, randomToken } from "@/lib/db";
import { PRICE, songTitle } from "@/lib/draft";
import { startSong } from "@/lib/music";
import { payappEnabled, requestPayment } from "@/lib/payapp";
import { parseDraft } from "@/lib/validate";

const MAX_BODY = 32 * 1024;
const PHONE_RE = /^01\d{8,9}$/;

// 주문을 만든다. 페이앱이 켜져 있으면 결제 대기(ready)로 만들고 결제창 주소를 돌려주며,
// 노래 제작은 결제 완료 알림(/api/payapp/feedback)에서 시작한다. 꺼져 있으면 시제품 모의 결제로 바로 결제 완료 처리한다.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: { draft?: unknown; phone?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const draft = parseDraft(body.draft);
  if (!draft) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const payapp = payappEnabled(env);
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  if (payapp && !PHONE_RE.test(phone)) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const id = randomToken(16);
  const ownerToken = randomToken();
  const giftToken = randomToken();
  const now = new Date().toISOString();
  const orderNo = `OY-${Date.now().toString(36).toUpperCase()}`;
  // 가사는 결제 후 ElevenLabs가 노래와 함께 쓴다. 완성 전까지는 제목만 있는 빈 가사를 둔다.
  const lyrics = { title: songTitle(draft), sections: [] };

  const db = await getDb();
  // orders.paid_at은 주문 시각으로 채우고, 실제 결제 시각은 payments.paid_at에 남긴다.
  await db.batch([
    db
      .prepare(
        `INSERT INTO orders (id, owner_token_hash, gift_token, gift_enabled, order_no, email, draft_json, lyrics_json, created_at, paid_at)
         VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, await hashToken(ownerToken), giftToken, orderNo, draft.email.trim(), JSON.stringify(draft), JSON.stringify(lyrics), now, now),
    db
      .prepare("INSERT INTO payments (order_id, provider, status, amount, created_at, paid_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, payapp ? "payapp" : "mock", payapp ? "ready" : "paid", PRICE, now, payapp ? null : now),
  ]);

  if (!payapp) {
    await startSong(id, draft, lyrics.title);
    return NextResponse.json({ id, ownerToken, giftToken, orderNo, paidAt: now }, { status: 201 });
  }

  const pay = await requestPayment(env, { orderId: id, amount: PRICE, goodname: "Only U song 맞춤 노래", phone, origin: new URL(req.url).origin });
  if (!pay) {
    await db.batch([db.prepare("DELETE FROM payments WHERE order_id = ?").bind(id), db.prepare("DELETE FROM orders WHERE id = ?").bind(id)]);
    return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  }
  await db.prepare("UPDATE payments SET provider_ref = ? WHERE order_id = ?").bind(pay.mulNo, id).run();
  return NextResponse.json({ id, ownerToken, giftToken, orderNo, paidAt: null, payurl: pay.payurl }, { status: 201 });
}
