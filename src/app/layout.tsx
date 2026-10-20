import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import SourceTracker from "@/components/SourceTracker";
import { BUSINESS } from "@/lib/business";
import "./globals.css";

// 카카오톡·SNS에 링크를 보내면 보이는 미리보기 카드. 이미지는 public/og.png(1200×630).
export const metadata: Metadata = {
  metadataBase: new URL("https://song.guidejung.com"),
  // 다른 페이지는 제목만 정하면 " · Only U song"이 붙는다.
  title: { default: "Only U song — 단 한 사람을 위한 노래", template: "%s · Only U song" },
  description:
    "엄마·아빠·연인·친구의 이름과 추억을 들려주면 AI가 가사와 노래를 1분 만에 만들어 드려요. 생일·환갑·기념일에 보내는 맞춤 노래 선물, 9,900원부터.",
  keywords: ["노래 선물", "맞춤 노래", "AI 노래", "이름 넣은 노래", "생일 선물", "부모님 선물", "환갑 선물", "기념일 선물"],
  openGraph: {
    type: "website",
    siteName: "Only U song",
    locale: "ko_KR",
    title: "Only U song — 단 한 사람을 위한 노래",
    description: "이름과 추억을 들려주세요. 1분이면 그 사람만의 노래가 완성돼요.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "선글라스를 끼고 노래하는 말 캐릭터와 Only U song" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#141833",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 가사 카드의 "전하는 말"과 사이트의 --serif 글꼴 */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@700&display=swap" />
      </head>
      <body>
        <SourceTracker />
        <div className="proto-banner" role="note">
          시제품 화면입니다 · 실제 결제와 음악 제작은 이루어지지 않습니다
        </div>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="logo" aria-label="Only U song 홈">
              <span className="logo-mark" aria-hidden>
                <Mascot size={36} />
              </span>
              Only U song
            </Link>
            <nav className="header-nav">
              <Link href="/songs">내 노래</Link>
              <Link href="/create" className="btn btn-small">
                노래 만들기
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="container">
            <p className="footer-brand">Only U song · 온리유송</p>
            <p>AI로 가사와 음악을 만드는 맞춤 노래 선물 서비스입니다.</p>
            <p className="footer-links">
              <Link href="/terms">이용약관</Link>
              <Link href="/privacy">
                <strong>개인정보처리방침</strong>
              </Link>
              <Link href="/refund">환불 정책</Link>
              <Link href="/find">주문 찾기</Link>
            </p>
            <p className="muted">
              상호 {BUSINESS.name} · 대표자 {BUSINESS.owner} · 사업자등록번호 {BUSINESS.regNo}
              <br />
              통신판매업 신고: {BUSINESS.mailOrder}
              <br />
              주소 {BUSINESS.address}
              <br />
              전화 {BUSINESS.phone} · 이메일 {BUSINESS.email}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
