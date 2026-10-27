import { forbidden, isAdmin } from "@/lib/admin";
import { getDb, staleBefore } from "@/lib/db";
import type { Draft } from "@/lib/draft";
import { callName } from "@/lib/draft";

type Row = {
  id: string;
  order_no: string;
  email: string;
  draft_json: string;
  created_at: string;
  song_status: string | null;
  song_title: string | null;
  paid_total: number;
  pending: number;
  cancelled: number;
  purchases: number;
};

// 최근 주문 목록. q로 주문번호·이메일 일부를 찾고, status=failed면 제작 실패 주문만 보여 준다.
export async function GET(req: Request) {
  if (!(await isAdmin(req))) return forbidden();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const failedOnly = url.searchParams.get("status") === "failed";
  const db = await getDb();
  const where: string[] = [];
  const args: unknown[] = [];
  if (q) {
    where.push("(o.order_no LIKE ? OR o.email LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }
  // 10분 넘게 만드는 중으로 멈춘 노래도 실패로 본다.
  if (failedOnly) {
    where.push("(s.status = 'failed' OR (s.status = 'generating' AND s.started_at < ?))");
    args.push(staleBefore());
  }
  const { results } = await db
    .prepare(
      `SELECT o.id, o.order_no, o.email, o.draft_json, o.created_at,
        CASE WHEN s.status = 'generating' AND s.started_at < ? THEN 'failed' ELSE s.status END song_status, s.title song_title,
        (SELECT coalesce(sum(amount),0) FROM purchases p WHERE p.order_id = o.id AND p.status = 'paid') paid_total,
        (SELECT count(*) FROM purchases p WHERE p.order_id = o.id AND p.status = 'ready') pending,
        (SELECT count(*) FROM purchases p WHERE p.order_id = o.id AND p.status = 'cancelled') cancelled,
        (SELECT count(*) FROM purchases p WHERE p.order_id = o.id) purchases
       FROM orders o LEFT JOIN songs s ON s.order_id = o.id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY o.created_at DESC LIMIT 100`,
    )
    .bind(staleBefore(), ...args)
    .all<Row>();
  return Response.json(
    results.map((r) => {
      const d = JSON.parse(r.draft_json) as Draft;
      return {
        id: r.id,
        orderNo: r.order_no,
        email: r.email,
        createdAt: r.created_at,
        to: callName(d),
        songStatus: r.song_status ?? "none",
        songTitle: r.song_title,
        paidTotal: r.paid_total,
        pending: r.pending > 0,
        cancelled: r.cancelled > 0,
        legacy: r.purchases === 0,
      };
    }),
  );
}
