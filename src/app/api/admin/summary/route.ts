import { forbidden, isAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

// 한국 시간 기준 오늘·이번 달의 시작 시각(UTC ISO 문자열).
function kstStarts() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const iso = (t: number) => new Date(t - 9 * 3600 * 1000).toISOString();
  return { today: iso(Date.UTC(y, m, d)), month: iso(Date.UTC(y, m, 1)) };
}

export async function GET(req: Request) {
  if (!(await isAdmin(req))) return forbidden();
  const db = await getDb();
  const { today, month } = kstStarts();
  const one = async <T,>(sql: string, ...args: unknown[]) => (await db.prepare(sql).bind(...args).first<T>())!;
  const [ordersToday, ordersMonth, revToday, revMonth, gens, songs] = await Promise.all([
    one<{ n: number }>("SELECT count(*) n FROM orders WHERE created_at >= ?", today),
    one<{ n: number }>("SELECT count(*) n FROM orders WHERE created_at >= ?", month),
    one<{ s: number; n: number }>("SELECT coalesce(sum(amount),0) s, count(*) n FROM purchases WHERE status = 'paid' AND paid_at >= ?", today),
    one<{ s: number; n: number }>("SELECT coalesce(sum(amount),0) s, count(*) n FROM purchases WHERE status = 'paid' AND paid_at >= ?", month),
    one<{ n: number }>("SELECT count(*) n FROM generations WHERE created_at >= ?", month),
    db.prepare("SELECT status, count(*) n FROM songs GROUP BY status").all<{ status: string; n: number }>(),
  ]);
  return Response.json({
    ordersToday: ordersToday.n,
    ordersMonth: ordersMonth.n,
    revenueToday: revToday.s,
    paymentsToday: revToday.n,
    revenueMonth: revMonth.s,
    paymentsMonth: revMonth.n,
    // ElevenLabs는 만든 음원 길이로 차감한다. 한 번 생성에 2.5분.
    generationsMonth: gens.n,
    musicMinutesMonth: gens.n * 2.5,
    songs: Object.fromEntries(songs.results.map((r) => [r.status, r.n])),
  });
}
