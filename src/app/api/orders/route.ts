import { NextResponse } from "next/server";
import { getDb, hashToken, randomToken } from "@/lib/db";
import { parseDraft, parseLyrics } from "@/lib/validate";

const MAX_BODY = 32 * 1024;

// 시제품의 "결제 완료" 처리. 실제 서비스에서는 PG 결제 결과를 서버에서 검증한 뒤에만 주문을 만든다.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let body: { draft?: unknown; lyrics?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const draft = parseDraft(body.draft);
  const lyrics = parseLyrics(body.lyrics);
  if (!draft || !lyrics) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const id = randomToken(16);
  const ownerToken = randomToken();
  const giftToken = randomToken();
  const now = new Date().toISOString();
  const orderNo = `OY-${Date.now().toString(36).toUpperCase()}`;

  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO orders (id, owner_token_hash, gift_token, gift_enabled, order_no, email, draft_json, lyrics_json, created_at, paid_at)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, await hashToken(ownerToken), giftToken, orderNo, draft.email.trim(), JSON.stringify(draft), JSON.stringify(lyrics), now, now)
    .run();

  return NextResponse.json({ id, ownerToken, giftToken, orderNo, paidAt: now }, { status: 201 });
}
