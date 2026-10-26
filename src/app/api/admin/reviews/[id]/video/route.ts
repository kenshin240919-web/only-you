import { getCloudflareContext } from "@opennextjs/cloudflare";
import { forbidden, isAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { MAX_VIDEO_BYTES, VIDEO_TYPES, getReview } from "@/lib/reviews";

// 관리자: 후기 영상을 올린다. 파일 내용을 그대로 R2로 흘려 보내 메모리에 다 올리지 않는다.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return forbidden();
  const { id } = await params;
  const review = await getReview(id);
  if (!review) return Response.json({ error: "not_found" }, { status: 404 });
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = VIDEO_TYPES[type];
  if (!ext) return Response.json({ error: "type", message: "mp4 · mov 영상만 올릴 수 있어요." }, { status: 415 });
  const size = Number(req.headers.get("content-length"));
  if (!size || size > MAX_VIDEO_BYTES) return Response.json({ error: "size", message: "영상은 95MB까지 올릴 수 있어요." }, { status: 413 });
  if (!req.body) return Response.json({ error: "empty" }, { status: 400 });

  const { env } = await getCloudflareContext({ async: true });
  const key = `reviews/${id}.${ext}`;
  if (review.video_key && review.video_key !== key) await env.SONGS.delete(review.video_key);
  // R2는 길이를 아는 스트림만 받는다. Next를 거친 요청 본문은 길이 정보가 없어 크기를 지정한 스트림으로 옮겨 담는다.
  const { readable, writable } = new FixedLengthStream(size);
  await Promise.all([env.SONGS.put(key, readable, { httpMetadata: { contentType: type } }), req.body.pipeTo(writable)]);
  const db = await getDb();
  await db.prepare("UPDATE reviews SET video_key = ?, video_type = ? WHERE id = ?").bind(key, type, id).run();
  return Response.json({ ok: true });
}
