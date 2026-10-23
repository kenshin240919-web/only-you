import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { paymentProvider } from "@/lib/payapp";

// 결제 화면이 실제 결제(페이앱)인지, 모의 결제인지, 지금 결제를 받을 수 없는지 알려 준다.
export async function GET() {
  const { env } = await getCloudflareContext({ async: true });
  return NextResponse.json({ provider: paymentProvider(env) });
}
