import { listReviews } from "@/lib/reviews";

const SITE = "https://song.guidejung.com";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

// 후기 코너 RSS. 네이버 서치어드바이저 등에 제출해 새 후기를 빨리 알린다.
export async function GET() {
  const reviews = await listReviews(true);
  const items = reviews
    .slice(0, 50)
    .map(
      (r) => `<item>
<title>${esc(`${r.occasion} · ${r.name}`)}</title>
<link>${SITE}/stories#${r.id}</link>
<guid isPermaLink="false">${r.id}</guid>
<pubDate>${new Date(r.created_at).toUTCString()}</pubDate>
<description>${esc(r.body)}</description>
</item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Only U song 노래 선물 후기</title>
<link>${SITE}/stories</link>
<description>Only U song으로 노래를 선물한 분들의 후기</description>
<language>ko</language>
${items}
</channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}
