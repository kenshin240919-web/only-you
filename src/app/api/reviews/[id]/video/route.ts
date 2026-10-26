import { serveObject } from "@/lib/audio";
import { getReview } from "@/lib/reviews";

// 후기 코너의 영상. 공개된 후기만 열린다.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getReview(id);
  if (!r || r.published !== 1 || !r.video_key) return new Response("not found", { status: 404 });
  return serveObject(req, r.video_key, r.video_type ?? "video/mp4", "public, max-age=3600");
}
