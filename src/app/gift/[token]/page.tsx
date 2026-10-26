import type { Metadata } from "next";
import { cache } from "react";
import EmptyState from "@/components/EmptyState";
import GiftReveal from "@/components/GiftReveal";
import { getGift, getGiftOrder } from "@/lib/db";
import { songLock } from "@/lib/lock";

export const dynamic = "force-dynamic";

// 미리보기 정보와 화면이 같은 요청에서 DB를 한 번만 읽도록 묶는다.
const loadGift = cache((token: string) => (/^[A-Za-z0-9_-]{20,64}$/.test(token) ? getGift(token) : Promise.resolve(null)));

// 선물 링크는 개인적인 내용이므로 검색엔진에 노출하지 않는다.
// 카톡 미리보기에는 받는 분 호칭과 노래 제목만 싣고, 전하는 말·가사는 싣지 않는다.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const gift = await loadGift((await params).token);
  const title = gift ? `${gift.callName}에게 노래 선물이 도착했어요` : "노래 선물이 도착했어요";
  const description = gift ? `「${gift.title}」 · 눌러서 지금 들어 보세요.` : "단 한 사람을 위해 만든 노래예요.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: "Only U song",
      locale: "ko_KR",
      title,
      description,
      images: [{ url: "/og-gift.png", width: 1200, height: 630, alt: "노래 선물이 도착했어요" }],
    },
  };
}

export default async function GiftPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const gift = await loadGift(token);
  // 듣기가 정지된 노래(오픈 기념 무료 기한 만료 · 관리자 정지)는 선물 링크도 열지 않는다.
  const order = gift ? await getGiftOrder(token) : null;
  if (order && (await songLock(order.id)).locked) {
    return <EmptyState title="노래 듣기가 잠시 멈췄어요" desc="이 노래는 지금 들을 수 없어요. 노래를 보내 준 분께 문의해 주세요." href="/" cta="Only U song 둘러보기" />;
  }
  if (!gift) {
    return <EmptyState title="선물을 찾을 수 없어요" desc="링크가 꺼졌거나 잘못되었을 수 있어요." href="/" cta="Only U song 둘러보기" />;
  }
  return <GiftReveal gift={gift} token={token} />;
}
