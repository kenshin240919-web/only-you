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
  paidAt: string | null;
  orderNo: string | null;
  // 결제 후 서버(D1)에 저장된 주문을 가리킨다. ownerToken은 이 기기만 아는 비밀값이다.
  orderId: string | null;
  ownerToken: string | null;
  giftToken: string | null;
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


const STORAGE_KEY = "onlyyou:order";
// 공용 기기에 사연이 오래 남지 않도록 로컬 초안은 7일 뒤 만료한다.
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function emptyOrder(): OrderState {
  return { draft: { ...EMPTY_DRAFT }, paidAt: null, orderNo: null, orderId: null, ownerToken: null, giftToken: null };
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

/** 노래가 완성되기 전까지 쓰는 임시 제목. 완성되면 ElevenLabs가 붙인 제목으로 바뀐다. */
export function songTitle(d: Draft): string {
  return `${callName(d)}에게 보내는 노래`;
}
