import { GENRES, REASONS, RELATIONSHIPS, labelOf } from "./options";

export type Draft = {
  relationship: string;
  customRelationship: string;
  name: string;
  nickname: string;
  pronunciation: string;
  reason: string;
  customReason: string;
  genre: string;
  vocal: string;
  traits: string;
  memory: string;
  message: string;
  exclude: string;
  email: string;
  agreeRequired: boolean;
  agreeMarketing: boolean;
};

export type LyricSection = { label: string; lines: string[] };

export type Lyrics = { title: string; sections: LyricSection[] };

export type OrderState = {
  draft: Draft;
  lyrics: Lyrics | null;
  rewrites: number;
  confirmedAt: string | null;
  paidAt: string | null;
  orderNo: string | null;
};

export const EMPTY_DRAFT: Draft = {
  relationship: "",
  customRelationship: "",
  name: "",
  nickname: "",
  pronunciation: "",
  reason: "",
  customReason: "",
  genre: "",
  vocal: "",
  traits: "",
  memory: "",
  message: "",
  exclude: "",
  email: "",
  agreeRequired: false,
  agreeMarketing: false,
};

export const MAX_REWRITES = 2;
export const PRICE = 19900;

const STORAGE_KEY = "onlyyou:order";
// 공용 기기에 사연이 오래 남지 않도록 로컬 초안은 7일 뒤 만료한다.
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function emptyOrder(): OrderState {
  return { draft: { ...EMPTY_DRAFT }, lyrics: null, rewrites: 0, confirmedAt: null, paidAt: null, orderNo: null };
}

export function loadOrder(): OrderState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyOrder();
    const parsed = JSON.parse(raw) as { savedAt: number; order: OrderState };
    if (Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return emptyOrder();
    }
    return { ...emptyOrder(), ...parsed.order, draft: { ...EMPTY_DRAFT, ...parsed.order.draft } };
  } catch {
    return emptyOrder();
  }
}

export function saveOrder(order: OrderState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), order }));
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 화면 상태만 유지한다.
  }
}

export function clearOrder(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function relationshipLabel(d: Draft): string {
  return d.relationship === "other" && d.customRelationship ? d.customRelationship : labelOf(RELATIONSHIPS, d.relationship);
}

export function reasonLabel(d: Draft): string {
  return d.reason === "custom" ? d.customReason : labelOf(REASONS, d.reason);
}

export function genreLabel(d: Draft): string {
  return labelOf(GENRES, d.genre);
}

/** 노래에서 부를 이름. 호칭을 고르면 호칭, 아니면 입력한 이름. */
export function callName(d: Draft): string {
  return d.nickname || d.name || relationshipLabel(d);
}

// 긴 문장을 노래 한 줄 길이로 자른다. 실제 서비스에서는 AI가 다시 쓴다.
function phrases(text: string, max = 2): string[] {
  return text
    .split(/[.!?\n。]+|,\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
    .slice(0, max);
}

const CHORUS_BY_REASON: Record<string, (n: string) => string[]> = {
  thanks: (n) => [`고마워요 ${n}`, "말로는 다 못 한 그 마음", "이 노래에 담아 전해요", `세상에 단 하나뿐인 ${n}`],
  love: (n) => [`사랑해 ${n}`, "오늘도 내일도 변함없이", "내 모든 계절이 너였어", "Only you, 오직 너만"],
  birthday: (n) => [`생일 축하해요 ${n}`, "태어나 줘서 정말 고마워", "올해도 웃는 날만 가득하길", "이 노래가 내 선물이야"],
  anniversary: (n) => [`함께한 날들이 노래가 되어`, `${n}, 기억하나요 우리`, "앞으로의 날들도 나란히", "Only you, 오직 당신만"],
  milestone: (n) => [`걸어오신 그 길 위에`, `꽃이 피었어요 ${n}`, "이제는 우리가 지켜 드릴게요", "오래오래 곁에 있어 주세요"],
  cheer: (n) => [`괜찮아 ${n}, 넌 잘하고 있어`, "넘어져도 다시 일어나는 너", "어디서든 응원할게", "언제나 네 편이야"],
  sorry: (n) => [`미안해요 ${n}`, "늦게 꺼낸 이 마음을", "노래로라도 전하고 싶어", "다시 웃어 줄 수 있나요"],
  miss: (n) => [`보고 싶어 ${n}`, "멀리 있어도 같은 하늘 아래", "네 목소리가 그리운 밤", "곧 만나러 갈게"],
};

const TITLES = [
  (n: string) => `${n}에게 보내는 노래`,
  (n: string) => `Only You, ${n}`,
  (n: string) => `${n}, 나의 계절`,
];

const OPENINGS = [
  (n: string) => [`${n}, 가만히 불러 보면`, "마음 한쪽이 따뜻해져요"],
  (n: string) => [`오늘은 용기 내어`, `${n}에게 노래를 불러요`],
  (n: string) => [`늘 곁에 있어서 몰랐던`, "그 다정한 온기를"],
];

/** 프로토타입용 가사 생성기. 실제 서비스에서는 서버의 AI 가사 생성으로 교체한다. */
export function generateLyrics(d: Draft, variant = 0): Lyrics {
  const n = callName(d);
  const traits = phrases(d.traits);
  const memory = phrases(d.memory, 3);
  const chorus = (CHORUS_BY_REASON[d.reason] ?? CHORUS_BY_REASON.love)(n);
  const v = variant % OPENINGS.length;

  const verse1 = [...OPENINGS[v](n), ...traits.map((t) => `${t}`)];
  if (verse1.length < 4) verse1.push("그런 당신이 참 좋아요");

  const verse2 = memory.length ? [...memory, "그날의 우리를 아직 기억해요"] : ["함께 걸었던 그 길 위에", "우리의 이야기가 남아 있어요"];

  const sections: LyricSection[] = [
    { label: "1절", lines: verse1 },
    { label: "후렴", lines: chorus },
    { label: "2절", lines: verse2 },
    { label: "후렴", lines: chorus },
  ];
  if (d.message.trim()) {
    sections.push({ label: "마무리", lines: [...phrases(d.message, 2), `${n}, 이 노래는 당신만을 위한 거예요`] });
  }
  return { title: TITLES[v](n), sections };
}

export function lyricsToText(l: Lyrics): string {
  return l.sections.map((s) => `[${s.label}]\n${s.lines.join("\n")}`).join("\n\n");
}

export function textToLyrics(title: string, text: string): Lyrics {
  const sections: LyricSection[] = [];
  let current: LyricSection | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const header = line.match(/^\[(.+)\]$/);
    if (header) {
      current = { label: header[1], lines: [] };
      sections.push(current);
    } else if (line) {
      if (!current) {
        current = { label: "가사", lines: [] };
        sections.push(current);
      }
      current.lines.push(line);
    }
  }
  return { title, sections };
}

export function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}
