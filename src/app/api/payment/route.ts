import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { payappEnabled } from "@/lib/payapp";

// 결제 화면이 실제 결제(페이앱)인지 모의 결제인지 알려 준다.
export async function GET() {
  const { env } = await getCloudflareContext({ async: true });
  return NextResponse.json({ provider: payappEnabled(env) ? "payapp" : "mock" });
}
