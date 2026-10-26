import { getCloudflareContext } from "@opennextjs/cloudflare";
import { forbidden, isAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { getReview } from "@/lib/reviews";

type Ctx = { params: Promise<{ id: string }> };

// 관리자: 후기 공개·숨김.
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAdmin(req))) return forbidden();
  const { id } = await params;
  const b = (await req.json().catch(() => null)) as { published?: unknown } | null;
  if (typeof b?.published !== "boolean") return Response.json({ error: "invalid" }, { status: 400 });
  const db = await getDb();
  await db.prepare("UPDATE reviews SET published = ? WHERE id = ?").bind(b.published ? 1 : 0, id).run();
  return Response.json({ ok: true });
}

// 관리자: 후기 삭제(게시 중단 요청 등). 영상 파일도 지운다.
export async function DELETE(req: Request, { params }: Ctx) {
  if (!(await isAdmin(req))) return forbidden();
  const { id } = await params;
  const r = await getReview(id);
  if (!r) return Response.json({ error: "not_found" }, { status: 404 });
  const { env } = await getCloudflareContext({ async: true });
  if (r.video_key) await env.SONGS.delete(r.video_key);
  const db = await getDb();
  await db.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
