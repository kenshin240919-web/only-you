import { NextResponse } from "next/server";
import { serveAudio } from "@/lib/audio";
import { getOwnedOrder, getSong } from "@/lib/db";

// 주문자용 음원. x-owner-token 헤더가 필요하므로 화면에서 fetch로 받아 재생·다운로드한다.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getOwnedOrder(id, req.headers.get("x-owner-token"));
  const song = row ? await getSong(row.id) : null;
  if (!song || song.status !== "ready" || !song.audio_key) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return serveAudio(req, song.audio_key);
}
