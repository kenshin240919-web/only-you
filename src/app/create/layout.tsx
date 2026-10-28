import type { Metadata } from "next";

// 이야기 쓰기 화면(클라이언트 컴포넌트)의 검색용 제목·설명.
export const metadata: Metadata = {
  title: "노래 만들기",
  description: "받는 분과의 추억과 전하고 싶은 말을 적으면 AI가 가사와 노래를 1분 만에 만들어요. 장르와 보컬도 고를 수 있어요.",
  alternates: { canonical: "/create" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
