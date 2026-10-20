import type { Metadata } from "next";

// 주문·개인 화면이라 검색엔진에 노출하지 않는다.
export const metadata: Metadata = { title: "주문 찾기", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
