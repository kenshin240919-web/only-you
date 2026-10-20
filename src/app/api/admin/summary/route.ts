import { getCloudflareContext } from "@opennextjs/cloudflare";
import { forbidden, isAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

// 음악 생성 1분에 드는 크레딧. ElevenLabs 요금 페이지 기준(1분 900크레딧)으로 넉넉하게 잡는다.
// 실제 대시보드 사용량을 역산하면 이보다 적게(약 750) 나와서, 이 값은 남은 곡 수를 적게 어림한다.
const CREDITS_PER_MINUTE = 900;
const MINUTES_PER_SONG = 2.5;
// 생성 기록(generations)을 남기기 시작한 시각. 이보다 먼저 시작한 주기에는 MUSIC_CREDITS_BEFORE_LOG를 더한다.
const LOG_START = "2026-10-20T00:00:00.000Z";

// 한국 시간 기준 오늘·이번 달의 시작 시각(UTC ISO 문자열).
function kstStarts() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const iso = (t: number) => new Date(t - 9 * 3600 * 1000).toISOString();
  return { today: iso(Date.UTC(y, m, d)), month: iso(Date.UTC(y, m, 1)) };
}

// ElevenLabs 요금제 주기의 시작(가장 최근의 갱신일, 한국 시간 0시)과 다음 갱신일.
function cycle(day: number) {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  let y = kst.getUTCFullYear();
  let m = kst.getUTCMonth();
  if (kst.getUTCDate() < day) m -= 1;
  const start = Date.UTC(y, m, day) - 9 * 3600 * 1000;
  const next = Date.UTC(y, m + 1, day) - 9 * 3600 * 1000;
  return { start: new Date(start).toISOString(), next: new Date(next).toISOString() };
}

export async function GET(req: Request) {
  if (!(await isAdmin(req))) return forbidden();
  const db = await getDb();
  const { today, month } = kstStarts();
  const { env } = await getCloudflareContext({ async: true });
  const planCredits = Number(env.MUSIC_PLAN_CREDITS) || 40000;
  const cyc = cycle(Number(env.MUSIC_CYCLE_DAY) || 1);
  const one = async <T,>(sql: string, ...args: unknown[]) => (await db.prepare(sql).bind(...args).first<T>())!;
  const [ordersToday, ordersMonth, revToday, revMonth, gens, songs] = await Promise.all([
    one<{ n: number }>("SELECT count(*) n FROM orders WHERE created_at >= ?", today),
    one<{ n: number }>("SELECT count(*) n FROM orders WHERE created_at >= ?", month),
    one<{ s: number; n: number }>("SELECT coalesce(sum(amount),0) s, count(*) n FROM purchases WHERE status = 'paid' AND paid_at >= ?", today),
    one<{ s: number; n: number }>("SELECT coalesce(sum(amount),0) s, count(*) n FROM purchases WHERE status = 'paid' AND paid_at >= ?", month),
    one<{ n: number }>("SELECT count(*) n FROM generations WHERE created_at >= ?", cyc.start),
    db.prepare("SELECT status, count(*) n FROM songs GROUP BY status").all<{ status: string; n: number }>(),
  ]);
  const before = cyc.start < LOG_START ? Number(env.MUSIC_CREDITS_BEFORE_LOG) || 0 : 0;
  const used = before + gens.n * MINUTES_PER_SONG * CREDITS_PER_MINUTE;
  return Response.json({
    ordersToday: ordersToday.n,
    ordersMonth: ordersMonth.n,
    revenueToday: revToday.s,
    paymentsToday: revToday.n,
    revenueMonth: revMonth.s,
    paymentsMonth: revMonth.n,
    // ElevenLabs는 만든 음원 길이로 차감한다. 요금제 주기(갱신일 기준) 동안의 생성 횟수로 크레딧을 어림한다.
    // 생성 기록(generations)은 2026-10-20부터 남기므로, 그 전 사용분은 들어가지 않는다.
    cycleStart: cyc.start,
    cycleNext: cyc.next,
    generationsCycle: gens.n,
    creditsCycle: used,
    planCredits,
    songsLeft: Math.max(0, Math.floor((planCredits - used) / (MINUTES_PER_SONG * CREDITS_PER_MINUTE))),
    songs: Object.fromEntries(songs.results.map((r) => [r.status, r.n])),
  });
}
