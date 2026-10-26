import { forbidden, isAdmin } from "@/lib/admin";
import { listPromoClaims, promoStatus, setPromo } from "@/lib/promo";

// 관리자: 오픈 기념 무료 상태와 받은 주문 목록.
export async function GET(req: Request) {
  if (!(await isAdmin(req))) return forbidden();
  return Response.json({ ...(await promoStatus()), claims: await listPromoClaims() });
}

// 관리자: 켜기·끄기와 인원 정하기.
export async function POST(req: Request) {
  if (!(await isAdmin(req))) return forbidden();
  const b = (await req.json().catch(() => null)) as { enabled?: unknown; limit?: unknown } | null;
  const limit = Math.round(Number(b?.limit));
  if (typeof b?.enabled !== "boolean" || !(limit >= 1 && limit <= 100)) return Response.json({ error: "invalid" }, { status: 400 });
  await setPromo(b.enabled, limit);
  return Response.json(await promoStatus());
}
