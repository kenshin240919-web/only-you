import { forbidden, isAdmin } from "@/lib/admin";
import { issueCoupon } from "@/lib/rewards";

// 관리자: 무료 노래 쿠폰(노래 듣기만) 만들기. 시험곡이나 고객 응대에 쓴다.
export async function POST(req: Request) {
  if (!(await isAdmin(req))) return forbidden();
  return Response.json({ code: await issueCoupon() });
}
