import { getCloudflareContext } from "@opennextjs/cloudflare";
import { forbidden, isAdmin } from "@/lib/admin";
import { type OrderRow, type SongRow, getDb, staleBefore, getPurchases, getRevisions, ownership, purchaseItems } from "@/lib/db";
import type { Draft, Lyrics } from "@/lib/draft";
import { setSongLock, songLock } from "@/lib/lock";
import { mailReward } from "@/lib/mail";
import { reviseSong } from "@/lib/music";
import { GENRES, VOCALS } from "@/lib/options";
import { getRewards, grantReward, revokeRewardsStatements } from "@/lib/rewards";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string) {
  const db = await getDb();
  const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<OrderRow>();
  if (!order) return null;
  const song = await db.prepare("SELECT * FROM songs WHERE order_id = ?").bind(id).first<SongRow>();
  return { order, song, purchases: await getPurchases(id), revisions: await getRevisions(id), rewards: await getRewards(id) };
}

// 주문 상세: 사연·가사·결제·수정·제작 오류까지 모두 보여 준다(관리자만).
export async function GET(req: Request, { params }: Ctx) {
  if (!(await isAdmin(req))) return forbidden();
  const { id } = await params;
  const data = await load(id);
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });
  const { order, song, purchases, revisions, rewards } = data;
  return Response.json({
    id: order.id,
    orderNo: order.order_no,
    email: order.email,
    createdAt: order.created_at,
    giftToken: order.gift_token,
    giftEnabled: order.gift_enabled === 1,
    draft: JSON.parse(order.draft_json) as Draft,
    ...ownership(purchases),
    purchases: purchases.map((p) => ({
      id: p.id,
      items: purchaseItems(p),
      amount: p.amount,
      provider: p.provider,
      status: p.status,
      providerRef: p.provider_ref,
      createdAt: p.created_at,
      paidAt: p.paid_at,
    })),
    lock: await songLock(order.id, purchases),
    rewards: rewards.map((r) => ({ kind: r.kind, benefit: r.benefit, couponCode: r.coupon_code, createdAt: r.created_at })),
    revisions: revisions.map((r) => ({ id: r.id, paid: r.paid === 1, status: r.status, request: JSON.parse(r.request_json), createdAt: r.created_at })),
    song: song
      ? {
          // 10분 넘게 만드는 중으로 멈췄으면 실패로 보여 줘 다시 만들 수 있게 한다.
          status: song.status === "generating" && song.started_at < staleBefore() ? "failed" : song.status,
          title: song.title,
          lyrics: song.lyrics_json ? (JSON.parse(song.lyrics_json) as Lyrics) : null,
          audioKey: song.audio_key,
          error: song.error,
          startedAt: song.started_at,
          finishedAt: song.finished_at,
        }
      : null,
  });
}

// 관리자 조치.
// regenerate: 우리 잘못·제작 실패 시 수정 횟수와 관계없이 무료로 다시 만든다.
// cancel_purchase: 페이앱 관리자 화면에서 환불한 뒤 알림이 오지 않았을 때 결제를 취소로 표시한다(돈을 돌려주지는 않는다).
// gift: 선물 링크 켜기·끄기.
// lock: 노래 듣기 정지(locked) · 기한과 관계없이 다시 열기(open) · 자동 규칙으로 되돌리기(auto).
// reward: 후기 확인 후 혜택 지급(video: 반응 영상, text: 글·사진 후기). 주문자에게 메일로 알린다.
export async function POST(req: Request, { params }: Ctx) {
  if (!(await isAdmin(req))) return forbidden();
  const { id } = await params;
  const data = await load(id);
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const db = await getDb();

  if (body?.action === "regenerate") {
    if (ownership(data.purchases).payment !== "paid") return Response.json({ error: "not_paid" }, { status: 409 });
    const { env } = await getCloudflareContext({ async: true });
    if ((env.MUSIC_GENERATION as string) !== "on" || !env.ELEVENLABS_API_KEY) {
      return Response.json({ error: "disabled", message: "노래 생성이 꺼져 있어요(MUSIC_GENERATION, ELEVENLABS_API_KEY)." }, { status: 409 });
    }
    // 생성이 꺼져 있던 주문(disabled)이나 기록이 없는 주문도 다시 만들 수 있게 실패 상태로 맞춘다.
    await db
      .prepare(
        "INSERT INTO songs (order_id, status, started_at) VALUES (?, 'failed', ?) ON CONFLICT(order_id) DO UPDATE SET status = 'failed' WHERE status = 'disabled'",
      )
      .bind(id, new Date().toISOString())
      .run();
    const genre = GENRES.some((g) => g.value === body.genre) ? String(body.genre) : "";
    const vocal = VOCALS.some((v) => v.value === body.vocal) ? String(body.vocal) : "";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
    const draft = JSON.parse(data.order.draft_json) as Draft;
    const title = (JSON.parse(data.order.lyrics_json) as Lyrics).title;
    const started = await reviseSong(id, draft, title, `a${Date.now().toString(36)}`, { genre, vocal, note }, "admin");
    return started
      ? Response.json({ ok: true })
      : Response.json({ error: "not_started", message: "이미 만드는 중이에요." }, { status: 409 });
  }

  if (body?.action === "cancel_purchase") {
    const p = data.purchases.find((x) => x.id === body.purchaseId);
    if (!p) return Response.json({ error: "not_found" }, { status: 404 });
    const stmts = [db.prepare("UPDATE purchases SET status = 'cancelled' WHERE id = ?").bind(p.id)];
    if (purchaseItems(p).includes("song")) stmts.push(db.prepare("UPDATE orders SET gift_enabled = 0 WHERE id = ?").bind(id), ...revokeRewardsStatements(db, id));
    await db.batch(stmts);
    return Response.json({ ok: true });
  }

  // delete: 시험 주문 정리. 주문과 결제·노래·수정·혜택 기록, 저장된 음원까지 지운다.
  // 생성 기록(generations)은 ElevenLabs 크레딧 사용량 계산에 쓰므로 남긴다. 확인을 위해 주문번호를 함께 받는다.
  if (body?.action === "delete") {
    if (body.orderNo !== data.order.order_no) return Response.json({ error: "confirm", message: "주문번호가 맞지 않아요." }, { status: 400 });
    const { env } = await getCloudflareContext({ async: true });
    const files = await env.SONGS.list({ prefix: `songs/${id}` });
    await Promise.all(files.objects.map((o) => env.SONGS.delete(o.key)));
    const del = (sql: string) => db.prepare(sql).bind(id);
    await db.batch([
      del("DELETE FROM purchases WHERE order_id = ?"),
      del("DELETE FROM songs WHERE order_id = ?"),
      del("DELETE FROM revisions WHERE order_id = ?"),
      del("DELETE FROM rewards WHERE order_id = ?"),
      del("DELETE FROM coupons WHERE source_order_id = ? AND used_order_id IS NULL"),
      del("DELETE FROM order_sources WHERE order_id = ?"),
      del("DELETE FROM order_access WHERE order_id = ?"),
      del("DELETE FROM promo_claims WHERE order_id = ?"),
      del("DELETE FROM song_locks WHERE order_id = ?"),
      del("UPDATE reviews SET order_id = NULL WHERE order_id = ?"),
      del("DELETE FROM orders WHERE id = ?"),
    ]);
    return Response.json({ ok: true, message: "주문을 지웠어요." });
  }

  if (body?.action === "gift" && typeof body.enabled === "boolean") {
    await db.prepare("UPDATE orders SET gift_enabled = ? WHERE id = ?").bind(body.enabled ? 1 : 0, id).run();
    return Response.json({ ok: true });
  }

  if (body?.action === "lock" && (body.state === "locked" || body.state === "open" || body.state === "auto")) {
    await setSongLock(id, body.state === "auto" ? null : body.state);
    return Response.json({ ok: true, message: body.state === "locked" ? "노래 듣기를 정지했어요." : "노래를 다시 열었어요." });
  }

  if (body?.action === "reward" && (body.kind === "video" || body.kind === "text")) {
    const r = await grantReward(id, body.kind);
    if (!r.ok) {
      const message = { already: "이미 이 종류의 혜택을 드렸어요.", not_paid: "결제가 끝난 주문이 아니에요.", nothing: "이미 가사 카드를 가진 주문이라 드릴 혜택이 없어요." }[r.reason];
      return Response.json({ error: r.reason, message }, { status: 409 });
    }
    const { env } = await getCloudflareContext({ async: true });
    await mailReward(env, id, r.benefit, r.couponCode, r.items);
    const opened = (r.items ?? []).map((i) => (i === "mp3" ? "MP3" : "가사 카드")).join("·");
    const message = r.benefit === "coupon" ? `무료 노래 쿠폰 ${r.couponCode}을 메일로 보냈어요.` : `${opened}를 열어 드렸어요.`;
    return Response.json({ ok: true, message });
  }

  return Response.json({ error: "invalid" }, { status: 400 });
}
