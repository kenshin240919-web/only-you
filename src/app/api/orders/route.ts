import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { createFreePurchase, createPurchase } from "@/lib/commerce";
import { getDb, hashToken, randomToken } from "@/lib/db";
import { songTitle } from "@/lib/draft";
import { payappEnabled } from "@/lib/payapp";
import { parsePhone } from "@/lib/phone";
import { mailAdminPromo } from "@/lib/mail";
import { claimPromo, promoStatus } from "@/lib/promo";
import { checkCoupon, normalizeCoupon, useCoupon } from "@/lib/rewards";
import type { Item } from "@/lib/pricing";
import { cleanSource } from "@/lib/source";
import { parseDraft } from "@/lib/validate";

const MAX_BODY = 32 * 1024;

// 헷갈리는 글자(0·O·1·I)를 뺀 대문자와 숫자.
const CODE = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const randomCode = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => CODE[b % CODE.length]).join("");

// 주문을 만들고 노래(+ 고른 추가 상품)를 결제한다. 노래 제작은 결제가 확인된 뒤 시작한다.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: { draft?: unknown; phone?: unknown; addons?: unknown; src?: unknown; coupon?: unknown; promo?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const draft = parseDraft(body.draft);
  if (!draft) return NextResponse.json({ error: "invalid" }, { status: 400 });
  // 오픈 기념 무료는 노래(듣기 · 선물 링크)를 결제 없이 만든다(자리는 주문을 만든 뒤 잡는다). MP3·가사 카드는 반응 영상 후기 혜택으로 연다.
  const promo = body.promo === true;
  if (promo && !(await promoStatus()).active) return NextResponse.json({ error: "promo_closed" }, { status: 400 });
  // 무료 노래 쿠폰은 노래 듣기만(MP3·가사 카드 제외) 결제 없이 만든다.
  const coupon = promo ? "" : normalizeCoupon(body.coupon);
  if (coupon) {
    const check = await checkCoupon(coupon);
    if (!check.valid) return NextResponse.json({ error: `coupon_${check.reason}` }, { status: 400 });
  }
  const addons = coupon || !Array.isArray(body.addons) ? [] : (["mp3", "card"] as const).filter((a) => (body.addons as unknown[]).includes(a));

  const { env } = await getCloudflareContext({ async: true });
  const phone = parsePhone(body.phone);
  if (!coupon && !promo && payappEnabled(env) && !phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

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
  // 관리자 화면의 유입 경로별 집계에 쓴다.
  const src = cleanSource(body.src);
  if (src) await db.prepare("INSERT INTO order_sources (order_id, src) VALUES (?, ?)").bind(id, src).run();

  const removeOrder = () =>
    db.batch([db.prepare("DELETE FROM orders WHERE id = ?").bind(id), db.prepare("DELETE FROM order_sources WHERE order_id = ?").bind(id)]);

  if (promo) {
    const claim = await claimPromo(draft.email, id);
    if (claim !== "ok") {
      await removeOrder();
      return NextResponse.json({ error: claim === "used" ? "promo_used" : "promo_closed" }, { status: 400 });
    }
    await createFreePurchase(id, ["song"], "promo");
    const st = await promoStatus();
    await mailAdminPromo(env, orderNo, st.used, st.limit);
    return NextResponse.json({ id, ownerToken, giftToken, orderNo, paidAt: now, payurl: null }, { status: 201 });
  }

  if (coupon) {
    if (!(await useCoupon(coupon, id))) {
      await db.batch([db.prepare("DELETE FROM orders WHERE id = ?").bind(id), db.prepare("DELETE FROM order_sources WHERE order_id = ?").bind(id)]);
      return NextResponse.json({ error: "coupon_used" }, { status: 400 });
    }
    await createFreePurchase(id, ["song"], "coupon");
    return NextResponse.json({ id, ownerToken, giftToken, orderNo, paidAt: now, payurl: null }, { status: 201 });
  }

  const purchase = await createPurchase(id, ["song", ...addons] as Item[], phone ?? "", new URL(req.url).origin, "orders");
  if (!purchase) {
    await db.batch([db.prepare("DELETE FROM orders WHERE id = ?").bind(id), db.prepare("DELETE FROM order_sources WHERE order_id = ?").bind(id)]);
    return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  }
  return NextResponse.json(
    { id, ownerToken, giftToken, orderNo, paidAt: purchase.payurl ? null : now, payurl: purchase.payurl },
    { status: 201 },
  );
}
