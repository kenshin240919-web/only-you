import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";
import GiftReveal from "@/components/GiftReveal";
import { getGift } from "@/lib/db";

export const dynamic = "force-dynamic";

// 선물 링크는 개인적인 내용이므로 검색엔진에 노출하지 않는다.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function GiftPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const gift = /^[A-Za-z0-9_-]{20,64}$/.test(token) ? await getGift(token) : null;
  if (!gift) {
    return <EmptyState title="선물을 찾을 수 없어요" desc="링크가 꺼졌거나 잘못되었을 수 있어요." href="/" cta="Only U song 둘러보기" />;
  }
  return <GiftReveal gift={gift} token={token} />;
}
