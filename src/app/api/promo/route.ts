import { NextResponse } from "next/server";
import { promoStatus } from "@/lib/promo";

// 오픈 기념 무료가 진행 중인지와 남은 자리(홈 배너 · 주문 확인 화면).
export async function GET() {
  const s = await promoStatus();
  return NextResponse.json({ active: s.active, left: s.left, limit: s.limit }, { headers: { "cache-control": "no-store" } });
}
