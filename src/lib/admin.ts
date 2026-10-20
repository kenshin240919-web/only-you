import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 관리자 로그인: 비밀 값 ADMIN_PASSWORD와 맞으면 12시간짜리 서명 쿠키를 준다.
// 비밀 값이 없거나 12자보다 짧으면 관리자 화면 자체가 꺼진다.
export const ADMIN_COOKIE = "oy_admin";
const TTL_MS = 12 * 60 * 60 * 1000;
const MIN_PASSWORD = 12;

async function secret(): Promise<string | null> {
  const { env } = await getCloudflareContext({ async: true });
  const pw = env.ADMIN_PASSWORD ?? "";
  return pw.length >= MIN_PASSWORD ? pw : null;
}

async function hmac(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// 길이가 같을 때 모든 글자를 비교해 응답 시간으로 값을 추측하기 어렵게 한다.
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function adminEnabled(): Promise<boolean> {
  return (await secret()) !== null;
}

/** 비밀번호가 맞으면 쿠키 값을 돌려준다. */
export async function login(password: string): Promise<string | null> {
  const pw = await secret();
  if (!pw || !same(await hmac(pw, password), await hmac(pw, pw))) return null;
  const exp = String(Date.now() + TTL_MS);
  return `${exp}.${await hmac(pw, `admin:${exp}`)}`;
}

export async function isAdmin(req: Request): Promise<boolean> {
  const pw = await secret();
  if (!pw) return false;
  const cookie = (req.headers.get("cookie") ?? "").split(/;\s*/).find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  const [exp, sig] = (cookie?.slice(ADMIN_COOKIE.length + 1) ?? "").split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return same(sig, await hmac(pw, `admin:${exp}`));
}

export function cookieHeader(value: string, maxAgeSec: number): string {
  return `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`;
}

export const forbidden = () => Response.json({ error: "forbidden" }, { status: 403 });
