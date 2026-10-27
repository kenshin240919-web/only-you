import type { Metadata } from "next";
import Link from "next/link";
import { listReviews, toView } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "노래 선물 후기",
  description: "Only U song으로 노래를 선물한 분들의 진짜 후기와 노래를 처음 듣는 순간의 영상.",
  alternates: { canonical: "/stories", types: { "application/rss+xml": "/stories/rss.xml" } },
};

const date = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });

export default async function StoriesPage() {
  const reviews = (await listReviews(true)).map(toView);
  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <h1>노래 선물 후기</h1>
        <p>노래를 선물한 분들이 직접 보내 주신 후기예요. 노래를 처음 듣는 순간을 함께 봐 주세요.</p>
      </div>

      <Link href="/review-event" className="card story-event">
        <strong>🎁 후기 이벤트</strong>
        <span className="muted">노래를 처음 듣는 순간을 영상으로 보내 주시면 MP3·가사 카드(올인원은 다음 노래 1곡 무료 쿠폰)를, 글·사진 후기는 가사 카드를 드려요 →</span>
      </Link>

      {reviews.length === 0 && <p className="muted" style={{ marginTop: 24 }}>첫 후기를 기다리고 있어요.</p>}
      <div className="stories">
        {reviews.map((r) => (
          <article key={r.id} id={r.id} className="card story">
            {r.hasVideo && <video className="story-video" src={`/api/reviews/${r.id}/video`} controls playsInline preload="metadata" />}
            <p className="story-occasion">{r.occasion}</p>
            <p className="story-body">{r.body}</p>
            <p className="muted story-meta">
              {r.name} · {date(r.createdAt)}
              {r.rewarded && " · 혜택을 받고 작성된 후기"}
            </p>
          </article>
        ))}
      </div>

      <Link href="/create" className="btn btn-block" style={{ marginTop: 24 }}>
        나도 노래 선물하기
      </Link>
    </div>
  );
}
