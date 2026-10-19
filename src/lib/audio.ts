import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** R2에 저장된 mp3를 Range 요청까지 지원해 돌려준다. 브라우저 플레이어의 탐색(seek)에 필요하다. */
export async function serveAudio(req: Request, key: string): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true });
  const obj = await env.SONGS.get(key, { range: req.headers });
  if (!obj) return new Response("not found", { status: 404 });

  const headers = new Headers({
    "content-type": "audio/mpeg",
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=3600",
    etag: obj.httpEtag,
  });

  const range = obj.range as { offset?: number; length?: number; suffix?: number } | undefined;
  if (range && req.headers.has("range")) {
    const start = range.suffix !== undefined ? obj.size - range.suffix : (range.offset ?? 0);
    const length = range.suffix ?? range.length ?? obj.size - start;
    headers.set("content-range", `bytes ${start}-${start + length - 1}/${obj.size}`);
    headers.set("content-length", String(length));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("content-length", String(obj.size));
  return new Response(obj.body, { headers });
}
