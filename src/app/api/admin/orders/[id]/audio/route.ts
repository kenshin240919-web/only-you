import { forbidden, isAdmin } from "@/lib/admin";
import { serveAudio } from "@/lib/audio";
import { getSong } from "@/lib/db";

// 관리자 확인용 음원 듣기.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return forbidden();
  const { id } = await params;
  const song = await getSong(id);
  if (!song?.audio_key) return new Response("not found", { status: 404 });
  return serveAudio(req, song.audio_key);
}
