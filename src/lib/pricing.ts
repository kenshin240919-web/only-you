// 가격 정책 (2026-10-19 결정, docs/DECISIONS.md). 금액은 모두 부가가치세 포함.
// 기본은 노래 듣기(스트리밍)이고, MP3와 가사 카드는 추가 상품이다. 셋을 모두 사면 올인원 가격이 된다.
export type Item = "song" | "mp3" | "card" | "revision";

export const PRICES = {
  song: 9900,
  mp3: 4900,
  card: 1900,
  revision: 1900,
  bundle: 14900,
} as const;

// 수정: 무료 1회 + 유료 2회. 우리 잘못(이름·호칭 오류, 추억 누락)으로 다시 만드는 것은 횟수에 넣지 않는다.
export const FREE_REVISIONS = 1;
export const PAID_REVISIONS = 2;
export const MAX_REVISIONS = FREE_REVISIONS + PAID_REVISIONS;

export const ITEM_LABELS: Record<Item, string> = {
  song: "맞춤 노래 (무제한 듣기)",
  mp3: "MP3 다운로드",
  card: "가사 카드",
  revision: "노래 수정 1회",
};

/** MP3와 가사 카드를 함께 사면 노래와 합쳐 올인원 가격이 되도록 둘을 묶어 할인한다. */
export const ADDON_PAIR = PRICES.bundle - PRICES.song;

export function priceOf(items: Item[]): number {
  let sum = items.reduce((s, i) => s + PRICES[i], 0);
  if (items.includes("mp3") && items.includes("card")) sum -= PRICES.mp3 + PRICES.card - ADDON_PAIR;
  return sum;
}

export function goodName(items: Item[]): string {
  if (items.includes("song")) return items.length === 3 ? "Only U song 올인원" : "Only U song 맞춤 노래";
  return `Only U song ${items.map((i) => ITEM_LABELS[i]).join(" + ")}`;
}

export function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}
