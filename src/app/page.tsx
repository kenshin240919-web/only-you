import Link from "next/link";
import SamplePlayer from "@/components/SamplePlayer";
import { PRICE, formatWon } from "@/lib/draft";

const SAMPLES = [
  {
    title: "고마워요, 엄마",
    tag: "부모님께 · 발라드 · 여성 보컬",
    emoji: "🌷",
    color: "#fde6df",
    lines: ["새벽마다 켜 두던 부엌 불빛", "그게 사랑인 줄 이제 알았어요"],
  },
  {
    title: "Only You, 지은",
    tag: "연인에게 · 어쿠스틱 · 남성 보컬",
    emoji: "💗",
    color: "#f3e3f7",
    lines: ["비 오던 성수동 골목에서", "우산 하나에 둘이 걷던 밤"],
  },
  {
    title: "괜찮아, 서준아",
    tag: "자녀에게 · 밝은 팝 · 여성 보컬",
    emoji: "⚽",
    color: "#e0eefc",
    lines: ["넘어져도 다시 일어나는 너", "언제나 엄마는 네 편이야"],
  },
];

const STEPS = [
  { title: "이야기 쓰기", desc: "8가지 질문에 답하면 돼요. 약 3~5분이면 충분해요." },
  { title: "가사 먼저 확인", desc: "결제 전에 가사를 무료로 보고 직접 고칠 수 있어요." },
  { title: "결제하고 제작", desc: "확정한 가사로 AI가 노래를 만들어요." },
  { title: "듣고 선물하기", desc: "MP3를 내려받고, 선물 링크로 마음을 전하세요." },
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
    a: "Only You는 AI로 가사와 음악을 만듭니다. 사람이 직접 작곡하거나 노래하지 않으며, 이 점을 숨기지 않습니다.",
  },
  {
    q: "결제 전에 무엇을 볼 수 있나요?",
    a: "입력하신 이야기로 만든 가사를 무료로 먼저 보여 드립니다. 직접 고치거나 AI에게 2번까지 다시 쓰게 할 수 있어요.",
  },
  {
    q: "노래를 받은 뒤 고칠 수 있나요?",
    a: "이름·호칭이 틀렸거나 추억이 빠지는 등 원래 주문 내용과 다르면 1회 무료로 다시 만들어 드립니다. 새로운 사연이나 다른 장르는 새 주문이에요.",
  },
  {
    q: "얼마나 걸리나요?",
    a: "정확한 전달 시간은 시범 운영에서 측정한 뒤 안내할 예정입니다. 완성되면 이메일로 알려 드려요.",
  },
  {
    q: "내 이야기는 안전한가요?",
    a: "사연은 노래 제작에만 쓰고, 노래 페이지는 기본 비공개입니다. 선물 링크는 원할 때 만들고 언제든 끌 수 있어요.",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero container">
        <span className="eyebrow">가사를 먼저 보고 결정하세요</span>
        <h1>
          세상에 단 한 사람,
          <br />
          <em>당신만을 위한 노래</em>
        </h1>
        <p>말로 다 못한 마음을 이야기로 들려주세요. 그 사람의 이름과 추억이 담긴 노래로 만들어 드릴게요.</p>
        <Link href="/create" className="btn">
          무료로 가사 받아보기 →
        </Link>
        <p className="hero-meta">
          완성곡 {formatWon(PRICE)} · MP3 다운로드 포함 · AI로 제작합니다
        </p>
      </section>

      <section className="section container">
        <h2>이런 노래가 만들어져요</h2>
        <p className="section-lead">가상의 이름과 사연으로 만든 예시입니다.</p>
        <div className="grid-3">
          {SAMPLES.map((s) => (
            <SamplePlayer key={s.title} {...s} />
          ))}
        </div>
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
        <div className="card price-card">
          <div className="price">{formatWon(PRICE)}</div>
          <p className="muted" style={{ margin: 0 }}>
            부가세 포함 · 1회 결제
          </p>
          <ul className="check-list">
            <li>이름과 추억을 담은 맞춤 가사 (결제 전 무료 확인)</li>
            <li>완성곡 1곡 (약 2분 30초 목표)</li>
            <li>MP3 다운로드 — 추가 비용 없음</li>
            <li>받는 분을 위한 선물 페이지 링크</li>
            <li>원래 주문과 다를 때 1회 무료 재제작</li>
            <li>노래 페이지 최소 12개월 보관</li>
          </ul>
          <Link href="/create" className="btn btn-block">
            노래 만들기 시작
          </Link>
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
        <p className="section-lead">가사 확인까지는 무료예요.</p>
        <Link href="/create" className="btn">
          무료로 가사 받아보기 →
        </Link>
      </section>
    </>
  );
}
