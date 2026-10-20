import { getCloudflareContext } from "@opennextjs/cloudflare";
import { forbidden, isAdmin } from "@/lib/admin";
import { mailEnabled, mailTest } from "@/lib/mail";

// 운영자 메일로 시험 메일을 보낸다. 메일 설정(EMAIL 바인딩, MAIL_FROM, ADMIN_EMAIL)을 확인하는 용도.
export async function POST(req: Request) {
  if (!(await isAdmin(req))) return forbidden();
  const { env } = await getCloudflareContext({ async: true });
  if (!mailEnabled(env)) return Response.json({ ok: false, message: "메일 발송 설정이 꺼져 있어요." });
  const ok = await mailTest(env);
  return Response.json({ ok, message: ok ? `${env.ADMIN_EMAIL}(으)로 보냈어요. 받은편지함(또는 스팸함)을 확인해 주세요.` : "보내지 못했어요. 로그를 확인해 주세요." });
}
