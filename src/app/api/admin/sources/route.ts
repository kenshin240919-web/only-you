import { forbidden, isAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

export type SourceRow = { src: string; visits: number; orders: number; paidOrders: number; revenue: number };

// 유입 경로별 방문·주문·결제 완료 주문(노래 결제)·매출. days=0이면 전체 기간. 경로를 모르는 주문은 direct로 센다.
export async function GET(req: Request) {
  if (!(await isAdmin(req))) return forbidden();
  const days = Math.max(0, Math.min(365, Number(new URL(req.url).searchParams.get("days")) || 0));
  // 한국 날짜 기준으로 오늘을 포함해 days일. 0이면 처음부터.
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const kstToday = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  const startMs = days ? kstToday - (days - 1) * 86400 * 1000 : 0;
  const sinceDay = new Date(startMs).toISOString().slice(0, 10);
  const since = new Date(startMs - 9 * 3600 * 1000).toISOString();

  const db = await getDb();
  const [visits, orders, revenue] = await Promise.all([
    db.prepare("SELECT src, sum(n) n FROM visits WHERE day >= ? GROUP BY src").bind(sinceDay).all<{ src: string; n: number }>(),
    db
      .prepare(
        `SELECT coalesce(s.src, 'direct') src, count(*) n,
           sum(EXISTS (SELECT 1 FROM purchases p WHERE p.order_id = o.id AND p.status = 'paid' AND p.items LIKE '%"song"%')) paid
         FROM orders o LEFT JOIN order_sources s ON s.order_id = o.id
         WHERE o.created_at >= ? GROUP BY 1`,
      )
      .bind(since)
      .all<{ src: string; n: number; paid: number }>(),
    db
      .prepare(
        `SELECT coalesce(s.src, 'direct') src, sum(p.amount) s
         FROM purchases p LEFT JOIN order_sources s ON s.order_id = p.order_id
         WHERE p.status = 'paid' AND p.paid_at >= ? GROUP BY 1`,
      )
      .bind(since)
      .all<{ src: string; s: number }>(),
  ]);

  const rows = new Map<string, SourceRow>();
  const row = (src: string) => rows.get(src) ?? rows.set(src, { src, visits: 0, orders: 0, paidOrders: 0, revenue: 0 }).get(src)!;
  for (const v of visits.results) row(v.src).visits = v.n;
  for (const o of orders.results) Object.assign(row(o.src), { orders: o.n, paidOrders: o.paid });
  for (const r of revenue.results) row(r.src).revenue = r.s;
  const list = [...rows.values()].sort((a, b) => b.revenue - a.revenue || b.orders - a.orders || b.visits - a.visits);
  return Response.json({ days, rows: list });
}
