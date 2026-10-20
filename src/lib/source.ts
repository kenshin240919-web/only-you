// 유입 경로 이름. 링크 뒤에 ?src=이름 을 붙이면 그 이름으로 방문·주문·매출을 따로 센다.
// 영문 소문자·숫자·-·_ 만 쓰고, 그 밖의 값은 버린다(관리자 표가 지저분해지지 않도록).
export function cleanSource(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return /^[a-z0-9_-]{1,24}$/.test(s) ? s : null;
}

// ?src가 없을 때 이전 페이지 주소로 경로를 짐작한다. 모르는 사이트는 other.
const REFERRERS: [RegExp, string][] = [
  [/(^|\.)saju\.guidejung\.com$/, "saju"],
  [/(^|\.)naver\.com$/, "naver"],
  [/(^|\.)google\./, "google"],
  [/(^|\.)daum\.net$/, "daum"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)facebook\.com$/, "facebook"],
  [/(^|\.)kakao(corp)?\.com$/, "kakao"],
  [/(^|\.)youtube\.com$/, "youtube"],
];

export function sourceFromReferrer(referrer: string, ownHost: string): string | null {
  let host: string;
  try {
    host = new URL(referrer).hostname;
  } catch {
    return null;
  }
  if (!host || host === ownHost) return null;
  return REFERRERS.find(([re]) => re.test(host))?.[1] ?? "other";
}
