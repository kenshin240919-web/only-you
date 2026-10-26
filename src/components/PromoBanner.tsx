"use client";

import Link from "next/link";
import { usePromo } from "./usePromo";

/** 홈: 오픈 기념 선착순 무료 배너. 진행 중일 때만 보인다. */
export default function PromoBanner() {
  const promo = usePromo();
  if (!promo) return null;
  return (
    <Link href="/create" className="promo-banner">
      <span className="promo-tag">오픈 기념 · 선착순 {promo.limit}명</span>
      <strong>맞춤 노래를 무료로 만들어 드려요</strong>
      <span>반응 영상을 보내 주시면 MP3·가사 카드까지 · 남은 자리 {promo.left}개 →</span>
    </Link>
  );
}
