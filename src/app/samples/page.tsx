import type { Metadata } from "next";
import Link from "next/link";
import SamplePlayer from "@/components/SamplePlayer";
import { SAMPLES } from "@/lib/samples";

export const metadata: Metadata = { title: "예시 노래 · Only U song" };

export default function SamplesPage() {
  return (
    <section className="section container">
      <div className="page-head">
        <h1>예시 노래 {SAMPLES.length}곡</h1>
        <p>가상의 이름과 사연으로 만든 예시입니다. 모든 노래는 AI로 만들었어요.</p>
      </div>
      <div className="grid-3">
        {SAMPLES.map((s) => (
          <SamplePlayer key={s.src} {...s} />
        ))}
      </div>
      <p style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/create" className="btn">
          노래 만들기 시작 →
        </Link>
      </p>
    </section>
  );
}
