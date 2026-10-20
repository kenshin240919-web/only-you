import { adminEnabled, cookieHeader, isAdmin, login } from "@/lib/admin";

// GET: 관리자 화면이 켜져 있는지와 로그인 상태. POST: 비밀번호로 로그인.
export async function GET(req: Request) {
  return Response.json({ enabled: await adminEnabled(), loggedIn: await isAdmin(req) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const value = typeof body?.password === "string" ? await login(body.password) : null;
  if (!value) {
    // 비밀번호를 빠르게 여러 번 대입하지 못하도록 실패 응답을 늦춘다.
    await new Promise((r) => setTimeout(r, 1000));
    return Response.json({ error: "wrong_password" }, { status: 401 });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": cookieHeader(value, 12 * 60 * 60) },
  });
}
