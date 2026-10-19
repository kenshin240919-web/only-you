import { NextResponse } from "next/server";
import { getDb, getOwnedOrder, getSong, songView } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const row = await getOwnedOrder(id, req.headers.get("x-owner-token"));
  if (!row) return notFound();
  return NextResponse.json({
    id: row.id,
    orderNo: row.order_no,
    paidAt: row.paid_at,
    giftToken: row.gift_token,
    giftEnabled: row.gift_enabled === 1,
    draft: JSON.parse(row.draft_json),
    lyrics: JSON.parse(row.lyrics_json),
    song: songView(await getSong(row.id)),
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const row = await getOwnedOrder(id, req.headers.get("x-owner-token"));
  if (!row) return notFound();
  const body = (await req.json().catch(() => null)) as { giftEnabled?: unknown } | null;
  if (typeof body?.giftEnabled !== "boolean") return NextResponse.json({ error: "invalid" }, { status: 400 });
  const db = await getDb();
  await db.prepare("UPDATE orders SET gift_enabled = ? WHERE id = ?").bind(body.giftEnabled ? 1 : 0, id).run();
  return NextResponse.json({ giftEnabled: body.giftEnabled });
}
