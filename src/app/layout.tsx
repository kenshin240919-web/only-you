import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Only U song — 단 한 사람을 위한 노래",
  description: "소중한 사람의 이야기를 담아, 가사를 먼저 확인하고 만드는 맞춤 노래 선물.",
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
            <p className="muted">사업자 정보와 약관은 정식 출시 전에 게시됩니다.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
