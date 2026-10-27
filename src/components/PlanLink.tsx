"use client";

import Link from "next/link";

// 가격표에서 고른 구성을 기억해 두었다가 주문 확인 화면의 기본 선택으로 쓴다(노래만 / 올인원).
export const PLAN_KEY = "onlyyou:plan";

export default function PlanLink({ plan, className, children }: { plan: "song" | "bundle"; className: string; children: React.ReactNode }) {
  return (
    <Link
      href="/create"
      className={className}
      onClick={() => {
        try {
          localStorage.setItem(PLAN_KEY, plan);
        } catch {}
      }}
    >
      {children}
    </Link>
  );
}
