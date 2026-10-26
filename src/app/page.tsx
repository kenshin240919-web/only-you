import type { Metadata } from "next";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import PromoBanner from "@/components/PromoBanner";
import SamplePlayer from "@/components/SamplePlayer";
import { ADDON_PAIR, ALL_IN_ONE_LIST, MAX_REVISIONS, PAID_REVISIONS, PRICES, formatWon } from "@/lib/pricing";
import { SAMPLES } from "@/lib/samples";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const STEPS = [
  { title: "이야기 쓰기", desc: "8가지 질문에 답하면 돼요. 약 3~5분이면 충분해요." },
  { title: "주문하기", desc: "입력한 내용을 확인하고 결제해요." },
  { title: "AI가 노래 제작", desc: "이야기로 가사와 노래를 함께 만들어요. 보통 1분 안에 완성돼요." },
  { title: "듣고 선물하기", desc: "노래를 듣고, 선물 링크로 마음을 전하세요." },
];

const FOR = [
  { href: "/create?for=mom", label: "엄마에게", emoji: "🌷" },
  { href: "/create?for=dad", label: "아빠에게", emoji: "🌳" },
  { href: "/create?for=wife", label: "아내에게", emoji: "💍" },
  { href: "/create?for=husband", label: "남편에게", emoji: "💍" },
  { href: "/create?for=girlfriend", label: "여자친구에게", emoji: "💗" },
  { href: "/create?for=boyfriend", label: "남자친구에게", emoji: "💙" },
  { href: "/create?for=daughter", label: "딸에게", emoji: "🎀" },
  { href: "/create?for=son", label: "아들에게", emoji: "⚽" },
];

const FAQ = [
  {
    q: "누가 노래를 만드나요?",
    a: "Only U song은 AI로 가사와 음악을 만듭니다. 사람이 직접 작곡하거나 노래하지 않으며, 이 점을 숨기지 않습니다.",
  },
  {
    q: "결제 전에 가사를 볼 수 있나요?",
    a: "가사와 노래는 결제 후 AI가 입력하신 이야기로 함께 만들어요. 위의 예시 노래로 어떤 느낌인지 먼저 들어 보세요.",
  },
  {
    q: "노래를 받은 뒤 고칠 수 있나요?",
    a: `같은 이야기 안에서 가사 표현·장르·보컬을 바꿔 다시 만들 수 있어요. 노래만 사면 첫 1회는 무료, 이후 ${PAID_REVISIONS}회까지 회당 ${formatWon(PRICES.revision)}이고, 올인원은 ${MAX_REVISIONS}회 모두 무료예요. 이름·호칭이 틀렸거나 추억이 빠진 경우는 횟수와 관계없이 무료로 다시 만들어 드려요. 사연 자체를 바꾸는 것은 새 주문이에요.`,
  },
  {
    q: "MP3와 가사 카드는 꼭 같이 사야 하나요?",
    a: `아니요. 노래(${formatWon(PRICES.song)})만 사서 들어 보신 뒤 '내 노래'에서 MP3(${formatWon(PRICES.mp3)})나 가사 카드(${formatWon(PRICES.card)})를 따로 살 수 있어요. 처음부터 모두 고르면 수정 ${MAX_REVISIONS}회까지 무료인 올인원 ${formatWon(PRICES.bundle)}이에요.`,
  },
  {
    q: "얼마나 걸리나요?",
    a: "결제 후 보통 1분 안에 완성돼요. 완성된 노래는 '내 노래'에서 바로 들을 수 있어요.",
  },
  {
    q: "내 이야기는 안전한가요?",
    a: "사연은 노래 제작에만 쓰고, 노래 페이지는 기본 비공개입니다. 선물 링크는 원할 때 만들고 언제든 끌 수 있어요.",
  },
];

export default function Home() {
  return (
    <>
      <section className="stage-hero">
        <div className="container">
          <span className="stage-tag">ON STAGE</span>
          <Mascot size={220} live />
          <h1>
            세상에 단 한 사람,
            <br />
            <em>당신만을 위한 노래</em>
          </h1>
          <p>이름과 추억을 들려주세요. 무대 위 가수가 그 사람만을 위한 노래로 불러 드릴게요.</p>
          <Link href="/create" className="btn">
            노래 만들기 시작 →
          </Link>
          <PromoBanner />
          <p className="hero-meta">
            {formatWon(PRICES.song)}부터 · 올인원 {formatWon(PRICES.bundle)} · AI로 제작합니다
          </p>
        </div>
      </section>

      <section className="container" aria-label="Only U song 한눈에 보기">
        <div className="poster">
          <p className="poster-kicker">주문하고 기다리지 마세요</p>
          <p className="poster-big">
            <span className="poster-num">1</span>분이면 완성
          </p>
          <p className="poster-sub">결제가 끝나면 바로 만들기 시작해, 보통 1분 안에 노래를 들을 수 있어요.</p>
          <ul className="poster-facts">
            <li>
              <strong>{formatWon(PRICES.bundle)}</strong>
              <span>올인원 (노래 + MP3 + 가사 카드 + 수정 {MAX_REVISIONS}회)</span>
            </li>
            <li>
              <strong>{formatWon(PRICES.song)}</strong>
              <span>노래만 먼저 들어 보기</span>
            </li>
            <li>
              <strong>수정 무료</strong>
              <span>올인원 {MAX_REVISIONS}회 · 노래만 사도 1회</span>
            </li>
          </ul>
          <Link href="/create" className="btn">
            지금 노래 만들기 →
          </Link>
        </div>
      </section>

      <section className="section container">
        <h2>이런 노래가 만들어져요</h2>
        <p className="section-lead">가상의 이름과 사연으로 만든 예시입니다.</p>
        <div className="grid-3">
          {SAMPLES.filter((s) => s.featured).map((s) => (
            <SamplePlayer key={s.src} {...s} />
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 20 }}>
          <Link href="/samples" className="btn-ghost">
            예시 노래 {SAMPLES.length}곡 모두 듣기 →
          </Link>
        </p>
      </section>

      <section className="section container">
        <h2>만드는 방법</h2>
        <p className="section-lead">네 단계면 충분해요.</p>
        <div className="grid-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card how-step">
              <span className="how-num">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section container">
        <h2>누구에게 선물할까요?</h2>
        <p className="section-lead">받는 분을 고르면 바로 시작해요.</p>
        <div className="choices">
          {FOR.map((f) => (
            <Link key={f.href} href={f.href} className="choice" style={{ textDecoration: "none" }}>
              <span aria-hidden>{f.emoji}</span>
              {f.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="section container" id="pricing">
        <h2>가격</h2>
        <p className="section-lead">숨은 비용 없이 한 번에 안내해요.</p>
        <div className="plans">
          <div className="card plan">
            <h3>노래</h3>
            <div className="price">{formatWon(PRICES.song)}</div>
            <ul className="check-list">
              <li>이름과 추억을 담은 맞춤 노래 1곡 (약 2분 30초 목표)</li>
              <li>무제한 듣기와 가사 보기</li>
              <li>받는 분을 위한 선물 페이지 링크</li>
              <li>수정 1회 무료</li>
            </ul>
          </div>
          <div className="card plan plan-best">
            <span className="plan-badge">추천</span>
            <h3>올인원</h3>
            <div className="price">{formatWon(PRICES.bundle)}</div>
            <p className="muted plan-save">
              따로 사면 {formatWon(ALL_IN_ONE_LIST)} → {formatWon(ALL_IN_ONE_LIST - PRICES.bundle)} 할인
            </p>
            <ul className="check-list">
              <li>노래 구성 전부</li>
              <li>MP3 다운로드</li>
              <li>선물용 가사 카드 이미지</li>
              <li>수정 {MAX_REVISIONS}회 모두 무료</li>
            </ul>
            <Link href="/create" className="btn btn-block">
              노래 만들기 시작
            </Link>
          </div>
        </div>
        <div className="card addons-table">
          <h3>추가 상품</h3>
          <div className="row-between">
            <span>MP3 다운로드</span>
            <span>{formatWon(PRICES.mp3)}</span>
          </div>
          <div className="row-between">
            <span>가사 카드</span>
            <span>{formatWon(PRICES.card)}</span>
          </div>
          <div className="row-between">
            <span>MP3 + 가사 카드 (노래를 산 뒤 함께, 수정 {MAX_REVISIONS}회 무료로)</span>
            <span>{formatWon(ADDON_PAIR)}</span>
          </div>
          <div className="row-between">
            <span>추가 수정 (노래만 산 경우, 최대 {PAID_REVISIONS}회)</span>
            <span>회당 {formatWon(PRICES.revision)}</span>
          </div>
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 13 }}>
            모든 가격은 부가세 포함, 1회 결제예요. 노래 페이지는 최소 12개월 보관해요.
          </p>
        </div>
      </section>

      <section className="section container narrow faq">
        <h2>자주 묻는 질문</h2>
        <p className="section-lead">궁금한 점을 먼저 확인하세요.</p>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <section className="section container" style={{ textAlign: "center" }}>
        <h2>오늘, 그 사람에게 노래를 선물하세요</h2>
        <p className="section-lead">3~5분이면 이야기를 다 쓸 수 있어요.</p>
        <Link href="/create" className="btn">
          노래 만들기 시작 →
        </Link>
      </section>
    </>
  );
}
