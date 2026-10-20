import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { createPurchase } from "@/lib/commerce";
import { getDb, hashToken, randomToken } from "@/lib/db";
import { songTitle } from "@/lib/draft";
import { payappEnabled } from "@/lib/payapp";
import { parsePhone } from "@/lib/phone";
import type { Item } from "@/lib/pricing";
import { parseDraft } from "@/lib/validate";

const MAX_BODY = 32 * 1024;

// 헷갈리는 글자(0·O·1·I)를 뺀 대문자와 숫자.
const CODE = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const randomCode = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => CODE[b % CODE.length]).join("");

// 주문을 만들고 노래(+ 고른 추가 상품)를 결제한다. 노래 제작은 결제가 확인된 뒤 시작한다.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: { draft?: unknown; phone?: unknown; addons?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const draft = parseDraft(body.draft);
  if (!draft) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const addons = Array.isArray(body.addons) ? (["mp3", "card"] as const).filter((a) => (body.addons as unknown[]).includes(a)) : [];

  const { env } = await getCloudflareContext({ async: true });
  const phone = parsePhone(body.phone);
  if (payappEnabled(env) && !phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const id = randomToken(16);
  const ownerToken = randomToken();
  const giftToken = randomToken();
  const now = new Date().toISOString();
  // 주문 찾기에 쓰이므로 시각 뒤에 무작위 글자를 붙여 추측하기 어렵게 한다.
  const orderNo = `OY-${Date.now().toString(36).toUpperCase()}-${randomCode(4)}`;
  // 가사는 결제 후 ElevenLabs가 노래와 함께 쓴다. 완성 전까지는 제목만 있는 빈 가사를 둔다.
  const lyrics = { title: songTitle(draft), sections: [] };

  const db = await getDb();
  // orders.paid_at은 주문 시각으로 채우고, 실제 결제 시각은 purchases.paid_at에 남긴다.
  await db
    .prepare(
      `INSERT INTO orders (id, owner_token_hash, gift_token, gift_enabled, order_no, email, draft_json, lyrics_json, created_at, paid_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, await hashToken(ownerToken), giftToken, orderNo, draft.email.trim(), JSON.stringify(draft), JSON.stringify(lyrics), now, now)
    .run();

  const purchase = await createPurchase(id, ["song", ...addons] as Item[], phone ?? "", new URL(req.url).origin, "orders");
  if (!purchase) {
    await db.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
    return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  }
  return NextResponse.json(
    { id, ownerToken, giftToken, orderNo, paidAt: purchase.payurl ? null : now, payurl: purchase.payurl },
    { status: 201 },
  );
}
