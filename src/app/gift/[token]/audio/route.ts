import { serveAudio } from "@/lib/audio";
import { getGiftOrder, getSong } from "@/lib/db";

// 받는 사람용 음원. 선물 링크가 켜져 있을 때만 열린다.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = /^[A-Za-z0-9_-]{20,64}$/.test(token) ? await getGiftOrder(token) : null;
  const song = order ? await getSong(order.id) : null;
  if (!song || song.status !== "ready" || !song.audio_key) return new Response("not found", { status: 404 });
  return serveAudio(req, song.audio_key);
}
