import { NextResponse } from "next/server";
import { type OrderRow, getDb, hashToken, randomToken } from "@/lib/db";

// 주문번호 + 주문할 때 쓴 이메일이 맞으면 이 기기용 접근 토큰을 새로 발급한다(원래 기기 토큰은 그대로).
// 무작위 대입을 막도록 한 시간에 IP당 10번, 이메일당 5번까지만 틀릴 수 있다.
const HOUR = 60 * 60 * 1000;
const IP_LIMIT = 10;
const EMAIL_LIMIT = 5;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { orderNo?: unknown; email?: unknown } | null;
  const orderNo = String(body?.orderNo ?? "").trim().toUpperCase().slice(0, 40);
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!orderNo || !email) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const db = await getDb();
  const now = Date.now();
  const since = new Date(now - HOUR).toISOString();
  const ipKey = `ip:${await hashToken(req.headers.get("cf-connecting-ip") ?? "unknown")}`;
  const emailKey = `email:${await hashToken(email)}`;
  const count = async (key: string) =>
    (await db.prepare("SELECT count(*) n FROM find_attempts WHERE key = ? AND created_at >= ?").bind(key, since).first<{ n: number }>())?.n ?? 0;
  if ((await count(ipKey)) >= IP_LIMIT || (await count(emailKey)) >= EMAIL_LIMIT) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }

  const row = await db.prepare("SELECT * FROM orders WHERE order_no = ?").bind(orderNo).first<OrderRow>();
  if (!row || row.email.trim().toLowerCase() !== email) {
    const at = new Date(now).toISOString();
    await db.batch([
      db.prepare("INSERT INTO find_attempts (key, created_at) VALUES (?, ?), (?, ?)").bind(ipKey, at, emailKey, at),
      db.prepare("DELETE FROM find_attempts WHERE created_at < ?").bind(new Date(now - 24 * HOUR).toISOString()),
    ]);
    // 실패 응답을 늦춰 빠른 대입을 어렵게 한다.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ownerToken = randomToken();
  await db
    .prepare("INSERT INTO order_access (token_hash, order_id, created_at) VALUES (?, ?, ?)")
    .bind(await hashToken(ownerToken), row.id, new Date(now).toISOString())
    .run();
  return NextResponse.json({
    id: row.id,
    ownerToken,
    giftToken: row.gift_token,
    orderNo: row.order_no,
    paidAt: row.paid_at,
    draft: JSON.parse(row.draft_json),
  });
}
