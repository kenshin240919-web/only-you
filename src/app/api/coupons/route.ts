import { NextResponse } from "next/server";
import { checkCoupon, normalizeCoupon } from "@/lib/rewards";

// 주문 확인 화면에서 쿠폰 번호가 쓸 수 있는지 미리 확인한다. 실제 사용은 주문할 때(POST /api/orders) 한다.
export async function GET(req: Request) {
  const code = normalizeCoupon(new URL(req.url).searchParams.get("code"));
  return NextResponse.json(await checkCoupon(code));
}
