import { NextResponse } from "next/server";
import { serveAudio } from "@/lib/audio";
import { getOwnedOrder, getSong } from "@/lib/db";
import { songLock } from "@/lib/lock";

// 주문자용 음원. x-owner-token 헤더가 필요하므로 화면에서 fetch로 받아 재생·다운로드한다.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getOwnedOrder(id, req.headers.get("x-owner-token"));
  const song = row ? await getSong(row.id) : null;
  // 수정본을 만드는 중이거나 수정이 실패해도 이전 노래는 계속 들을 수 있다.
  if (!song?.audio_key) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if ((await songLock(song.order_id)).locked) return NextResponse.json({ error: "locked" }, { status: 403 });
  return serveAudio(req, song.audio_key);
}
