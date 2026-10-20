import { getDb } from "@/lib/db";
import { cleanSource } from "@/lib/source";

// 방문 1번을 경로·한국 날짜별 합계에 더한다. 개인을 알아볼 수 있는 정보는 받지도 남기지도 않는다.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 200) return new Response(null, { status: 413 });
  let src: string | null = null;
  try {
    src = cleanSource((JSON.parse(text) as { src?: unknown }).src);
  } catch {}
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const db = await getDb();
  await db
    .prepare("INSERT INTO visits (day, src, n) VALUES (?, ?, 1) ON CONFLICT(day, src) DO UPDATE SET n = n + 1")
    .bind(day, src ?? "direct")
    .run();
  return new Response(null, { status: 204 });
}
