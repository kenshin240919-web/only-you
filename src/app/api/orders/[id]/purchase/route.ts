import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { createPurchase } from "@/lib/commerce";
import { getOwnedOrder, getPurchases, ownership } from "@/lib/db";
import { payappEnabled } from "@/lib/payapp";
import { parsePhone } from "@/lib/phone";

// 노래를 산 뒤 MP3·가사 카드를 추가로 산다. 이미 가진 상품은 다시 팔지 않는다.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getOwnedOrder(id, req.headers.get("x-owner-token"));
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { items?: unknown; phone?: unknown } | null;
  const { payment, owned } = ownership(await getPurchases(id));
  if (payment !== "paid") return NextResponse.json({ error: "not_paid" }, { status: 409 });
  const items = Array.isArray(body?.items) ? (["mp3", "card"] as const).filter((i) => (body.items as unknown[]).includes(i) && !owned.includes(i)) : [];
  if (!items.length) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const phone = parsePhone(body?.phone);
  if (payappEnabled(env) && !phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const purchase = await createPurchase(id, [...items], phone ?? "", new URL(req.url).origin, "songs");
  if (!purchase) return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  return NextResponse.json({ payurl: purchase.payurl });
}
