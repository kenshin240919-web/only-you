const PHONE_RE = /^01\d{8,9}$/;

/** 페이앱 필수값인 구매자 휴대폰 번호를 숫자만 남겨 검사한다. 맞지 않으면 null. */
export function parsePhone(input: unknown): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  return PHONE_RE.test(digits) ? digits : null;
}
