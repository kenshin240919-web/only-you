import { serveAudio } from "@/lib/audio";
import { getGiftOrder, getSong } from "@/lib/db";
import { songLock } from "@/lib/lock";

// 받는 사람용 음원. 선물 링크가 켜져 있고 듣기가 정지되지 않았을 때만 열린다.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = /^[A-Za-z0-9_-]{20,64}$/.test(token) ? await getGiftOrder(token) : null;
  const song = order ? await getSong(order.id) : null;
  if (!song?.audio_key) return new Response("not found", { status: 404 });
  if ((await songLock(song.order_id)).locked) return new Response("locked", { status: 403 });
  return serveAudio(req, song.audio_key);
}
