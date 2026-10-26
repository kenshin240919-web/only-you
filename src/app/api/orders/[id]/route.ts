import { NextResponse } from "next/server";
import { getDb, getOwnedOrder, getPurchases, getRevisions, getSong, ownership, songView } from "@/lib/db";
import { type Item, MAX_REVISIONS, freeRevisions } from "@/lib/pricing";

type Ctx = { params: Promise<{ id: string }> };

// 시작된 수정 수로 남은 무료·유료 횟수를 알려 준다.
function revisionSummary(rows: Awaited<ReturnType<typeof getRevisions>>, owned: Item[]) {
  const used = rows.filter((r) => r.status === "started").length;
  return {
    used,
    max: MAX_REVISIONS,
    freeLeft: Math.max(0, freeRevisions(owned) - used),
  };
}

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const row = await getOwnedOrder(id, req.headers.get("x-owner-token"));
  if (!row) return notFound();
  const purchases = await getPurchases(row.id);
  const own = ownership(purchases);
  return NextResponse.json({
    id: row.id,
    orderNo: row.order_no,
    paidAt: row.paid_at,
    giftToken: row.gift_token,
    giftEnabled: row.gift_enabled === 1,
    draft: JSON.parse(row.draft_json),
    lyrics: JSON.parse(row.lyrics_json),
    ...own,
    // 결제창에서 돌아온 직후처럼 결제 확인을 기다리는 구매가 있으면 화면이 다시 확인한다.
    pendingPurchase: purchases.some((p) => p.status === "ready"),
    revisions: revisionSummary(await getRevisions(row.id), own.bought),
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
