// OpenNext가 만든 Worker에 매일 Cron(scheduled)을 붙인다. 화면 · API는 그대로 OpenNext가 처리한다.
// Cron 시각은 wrangler.jsonc의 triggers.crons. 할 일은 Next API(/api/cron/*)에 두고 여기서는 부르기만 한다.
import { default as handler } from "./.open-next/worker.js";

export default {
  fetch: handler.fetch,
  async scheduled(_event: unknown, env: { SITE_URL: string }, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const req = new Request(`${env.SITE_URL.replace(/\/$/, "")}/api/cron/reminders`, { method: "POST" });
    ctx.waitUntil(
      handler.fetch(req, env, ctx).then(async (r: Response) => console.log("cron reminders", r.status, await r.text())),
    );
  },
};

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
