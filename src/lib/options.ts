export type Option = { value: string; label: string; emoji?: string };

export const RELATIONSHIPS: Option[] = [
  { value: "mom", label: "엄마", emoji: "🌷" },
  { value: "dad", label: "아빠", emoji: "🌳" },
  { value: "wife", label: "아내", emoji: "💍" },
  { value: "husband", label: "남편", emoji: "💍" },
  { value: "girlfriend", label: "여자친구", emoji: "💗" },
  { value: "boyfriend", label: "남자친구", emoji: "💙" },
  { value: "daughter", label: "딸", emoji: "🎀" },
  { value: "son", label: "아들", emoji: "⚽" },
  { value: "grandma", label: "할머니", emoji: "🍵" },
  { value: "grandpa", label: "할아버지", emoji: "📻" },
  { value: "friend", label: "친구", emoji: "🤝" },
  { value: "other", label: "그 외", emoji: "✉️" },
];

// 관계별로 노래에서 부를 호칭 후보. 이름 입력 후 버튼으로 노출한다.
export const NICKNAMES: Record<string, string[]> = {
  mom: ["엄마", "어머니"],
  dad: ["아빠", "아버지"],
  wife: ["여보", "자기야"],
  husband: ["여보", "자기야"],
  girlfriend: ["자기야"],
  boyfriend: ["자기야"],
  grandma: ["할머니"],
  grandpa: ["할아버지"],
};

export const REASONS: Option[] = [
  { value: "thanks", label: "고마워서" },
  { value: "love", label: "사랑해서" },
  { value: "birthday", label: "생일" },
  { value: "anniversary", label: "기념일" },
  { value: "milestone", label: "환갑·칠순" },
  { value: "cheer", label: "응원" },
  { value: "sorry", label: "미안해서" },
  { value: "miss", label: "보고 싶어서" },
];

export const GENRES: (Option & { desc: string })[] = [
  { value: "ballad", label: "발라드", desc: "잔잔한 피아노와 따뜻한 감성" },
  { value: "acoustic", label: "어쿠스틱", desc: "기타 한 대처럼 담백하게" },
  { value: "pop", label: "밝은 팝", desc: "경쾌하고 산뜻한 리듬" },
  { value: "trot", label: "트로트", desc: "흥겹고 정겨운 가락 (품질 시험 중)" },
];

export const VOCALS: Option[] = [
  { value: "female", label: "여성 보컬" },
  { value: "male", label: "남성 보컬" },
  { value: "any", label: "맡길게요" },
];

export function labelOf(list: Option[], value: string): string {
  return list.find((o) => o.value === value)?.label ?? value;
}
