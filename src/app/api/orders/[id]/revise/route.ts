import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { createPurchase, startRevision } from "@/lib/commerce";
import { getDb, getOwnedOrder, getPurchases, getRevisions, getSong, ownership, randomToken } from "@/lib/db";
import type { Draft, Lyrics } from "@/lib/draft";
import { GENRES, VOCALS } from "@/lib/options";
import { payappEnabled } from "@/lib/payapp";
import { parsePhone } from "@/lib/phone";
import { MAX_REVISIONS, freeRevisions } from "@/lib/pricing";

// 노래 수정 요청. 무료 횟수(기본 1회, 올인원 3회) 안에서는 바로 다시 만들고, 그 뒤는 1,900원씩 결제가 확인되면 다시 만든다.
// 같은 사연 안에서 가사 표현·장르·보컬을 바꿀 수 있고, 사연 자체를 바꾸는 것은 새 주문이다.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getOwnedOrder(id, req.headers.get("x-owner-token"));
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { genre?: unknown; vocal?: unknown; note?: unknown; phone?: unknown } | null;
  const genre = GENRES.some((g) => g.value === body?.genre) ? String(body?.genre) : "";
  const vocal = VOCALS.some((v) => v.value === body?.vocal) ? String(body?.vocal) : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";
  if (!genre && !vocal && !note) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { payment, bought } = ownership(await getPurchases(id));
  if (payment !== "paid") return NextResponse.json({ error: "not_paid" }, { status: 409 });
  const song = await getSong(id);
  if (song?.status !== "ready") return NextResponse.json({ error: "song_not_ready" }, { status: 409 });
  const revisions = await getRevisions(id);
  const used = revisions.filter((r) => r.status === "started").length;
  if (used >= MAX_REVISIONS) return NextResponse.json({ error: "limit" }, { status: 409 });

  const free = used < freeRevisions(bought);
  const { env } = await getCloudflareContext({ async: true });
  const phone = parsePhone(body?.phone);
  if (!free && payappEnabled(env) && !phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const db = await getDb();
  // 결제창을 닫고 다시 요청하면 이전의 결제 대기 수정은 취소한다. 그 결제가 나중에 완료되면 applyPaid가 다시 살려 진행한다.
  await db.prepare("UPDATE revisions SET status = 'cancelled' WHERE order_id = ? AND status = 'awaiting_payment'").bind(id).run();
  const revisionId = `rev_${randomToken(12)}`;
  await db
    .prepare("INSERT INTO revisions (id, order_id, paid, request_json, status, created_at) VALUES (?, ?, ?, ?, 'awaiting_payment', ?)")
    .bind(revisionId, id, free ? 0 : 1, JSON.stringify({ genre, vocal, note }), new Date().toISOString())
    .run();

  if (free) {
    const draft = JSON.parse(row.draft_json) as Draft;
    await startRevision(id, revisionId, draft, (JSON.parse(row.lyrics_json) as Lyrics).title);
    return NextResponse.json({ payurl: null });
  }

  // 결제 대기 중인 수정과 구매를 먼저 연결해야 결제 알림이 이 수정을 찾는다.
  const purchaseId = `pur_${randomToken(16)}`;
  await db.prepare("UPDATE revisions SET purchase_id = ? WHERE id = ?").bind(purchaseId, revisionId).run();
  const purchase = await createPurchase(id, ["revision"], phone ?? "", new URL(req.url).origin, "songs", purchaseId);
  if (!purchase) {
    await db.prepare("DELETE FROM revisions WHERE id = ?").bind(revisionId).run();
    return NextResponse.json({ error: "payment_unavailable" }, { status: 502 });
  }
  return NextResponse.json({ payurl: purchase.payurl });
}
