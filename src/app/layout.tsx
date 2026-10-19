import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BUSINESS } from "@/lib/business";
import "./globals.css";

export const metadata: Metadata = {
  title: "Only U song — 단 한 사람을 위한 노래",
  description: "소중한 사람의 이름과 추억을 담아 AI로 만드는 맞춤 노래 선물.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF6EF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <div className="proto-banner" role="note">
          시제품 화면입니다 · 실제 결제와 음악 제작은 이루어지지 않습니다
        </div>
        <header className="site-header">
          <div className="container header-inner">
            <Link href="/" className="logo" aria-label="Only U song 홈">
              <span className="logo-mark" aria-hidden>
                ♪
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
