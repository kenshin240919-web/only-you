import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { createPurchase } from "@/lib/commerce";
import { getOwnedOrder, getPurchases, ownership } from "@/lib/db";
import { songLock } from "@/lib/lock";
import { payappEnabled } from "@/lib/payapp";
import { parsePhone } from "@/lib/phone";

// 노래를 산 뒤 MP3·가사 카드를 추가로 산다. 이미 가진 상품은 다시 팔지 않는다.
// 듣기 기한이 지나 정지된 오픈 기념 무료 노래는 노래 값(song)을 결제해 다시 열 수 있다.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getOwnedOrder(id, req.headers.get("x-owner-token"));
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { items?: unknown; phone?: unknown } | null;
  const purchases = await getPurchases(id);
  const { payment, owned } = ownership(purchases);
  if (payment !== "paid") return NextResponse.json({ error: "not_paid" }, { status: 409 });
  const wanted = Array.isArray(body?.items) ? (body.items as unknown[]) : [];
  const lock = await songLock(id, purchases);
  if (wanted.includes("song") && lock.reason !== "expired") return NextResponse.json({ error: "invalid" }, { status: 400 });
  // 정지된 노래는 다시 여는 결제(song)만 받는다.
  if (lock.locked && !wanted.includes("song")) return NextResponse.json({ error: "locked" }, { status: 403 });
  const items = (["song", "mp3", "card"] as const).filter((i) => wanted.includes(i) && (i === "song" || !owned.includes(i)));
  if (!items.length) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const phone = parsePhone(body?.phone);
  if (payappEnabled(env) && !phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const purchase = await createPurchase(id, [...items], phone ?? "", new URL(req.url).origin, "songs");
  if (!purchase) return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  return NextResponse.json({ payurl: purchase.payurl });
}
