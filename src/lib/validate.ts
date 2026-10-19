import { type Draft, EMPTY_DRAFT } from "./draft";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 설문 화면의 최대 길이보다 약간 넉넉하게 잡은 서버 측 상한.
const MAX_FIELD = 800;

/** 클라이언트가 보낸 설문을 알려진 필드만 남겨 검증한다. 실패하면 null. */
export function parseDraft(input: unknown): Draft | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>;
  const out = { ...EMPTY_DRAFT };
  for (const key of Object.keys(EMPTY_DRAFT) as (keyof Draft)[]) {
    const v = src[key];
    if (typeof EMPTY_DRAFT[key] === "boolean") {
      (out[key] as boolean) = v === true;
    } else {
      if (typeof v !== "string" || v.length > MAX_FIELD) return null;
      (out[key] as string) = v;
    }
  }
  if (!out.relationship || !out.genre || !out.vocal || !out.agreeRequired) return null;
  if (!EMAIL_RE.test(out.email.trim())) return null;
  return out;
}
