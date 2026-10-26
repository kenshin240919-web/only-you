import { forbidden, isAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { listReviews, toView } from "@/lib/reviews";
import { newReviewId } from "@/lib/rewards";

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// 관리자: 후기 목록(공개 여부 포함).
export async function GET(req: Request) {
  if (!(await isAdmin(req))) return forbidden();
  const rows = await listReviews(false);
  return Response.json(rows.map((r) => ({ ...toView(r), published: r.published === 1, orderId: r.order_id })));
}

// 관리자: 후기 글을 만든다(영상은 만든 뒤 /video로 따로 올린다). 게시 동의를 확인했다는 체크가 있어야 한다.
export async function POST(req: Request) {
  if (!(await isAdmin(req))) return forbidden();
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = clip(b?.name, 30);
  const occasion = clip(b?.occasion, 40);
  const body = clip(b?.body, 1000);
  if (!name || !occasion || !body) return Response.json({ error: "invalid", message: "표시 이름 · 상황 · 후기 글을 모두 적어 주세요." }, { status: 400 });
  if (b?.consent !== true) return Response.json({ error: "consent", message: "게시 동의를 확인해 주세요." }, { status: 400 });
  const db = await getDb();
  let orderId: string | null = null;
  const orderNo = clip(b?.orderNo, 40).toUpperCase();
  if (orderNo) {
    const o = await db.prepare("SELECT id FROM orders WHERE order_no = ?").bind(orderNo).first<{ id: string }>();
    if (!o) return Response.json({ error: "order", message: "주문번호를 찾지 못했어요." }, { status: 400 });
    orderId = o.id;
  }
  const id = newReviewId();
  await db
    .prepare("INSERT INTO reviews (id, order_id, name, occasion, body, rewarded, published, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
    .bind(id, orderId, name, occasion, body, b?.rewarded === false ? 0 : 1, new Date().toISOString())
    .run();
  return Response.json({ id });
}
