import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sendPromoReminders } from "@/lib/reminders";

// 매일 Cron(worker.ts의 scheduled)이 부른다. 보낼 때가 된 안내만, 주문 · 종류마다 한 번씩 보내므로 여러 번 불려도 메일이 겹치지 않는다.
export async function POST() {
  const { env } = await getCloudflareContext({ async: true });
  return Response.json({ sent: await sendPromoReminders(env) });
}
