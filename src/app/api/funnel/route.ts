import { getDb } from "@/lib/db";

const STEPS = ["create", "checkout"];

// 단계 도착을 한국 날짜별 합계에 더한다(만들기 시작 · 주문 확인 도착). 개인을 알아볼 수 있는 정보는 받지 않는다.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 100) return new Response(null, { status: 413 });
  let step = "";
  try {
    step = String((JSON.parse(text) as { step?: unknown }).step ?? "");
  } catch {}
  if (!STEPS.includes(step)) return new Response(null, { status: 400 });
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const db = await getDb();
  await db.prepare("INSERT INTO funnel (day, step, n) VALUES (?, ?, 1) ON CONFLICT(day, step) DO UPDATE SET n = n + 1").bind(day, step).run();
  return new Response(null, { status: 204 });
}
