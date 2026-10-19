import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "./db";
import { type Draft, type LyricSection, type Lyrics, callName, reasonLabel, relationshipLabel } from "./draft";

// 가사도 ElevenLabs가 사연을 받아 직접 쓴다(A안). 결정 근거와 Claude 가사(B안)로 바꾸는 방법은 docs/DECISIONS.md.
const MODEL = "music_v2_5";
const LENGTH_MS = 150_000;
const ENDPOINT = `https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_44100_128`;

const GENRE_STYLE: Record<string, string> = {
  ballad: "a heartfelt Korean ballad with emotional piano and warm strings, slow tempo around 70 bpm",
  acoustic: "a warm Korean acoustic pop song with acoustic guitar and soft percussion, medium tempo around 90 bpm",
  pop: "a bright, upbeat Korean pop song with piano, acoustic guitar and handclaps, tempo around 110 bpm",
  trot: "a cheerful, nostalgic Korean trot song with a classic trot rhythm",
};

const VOCAL_STYLE: Record<string, string> = {
  female: "a warm female vocal",
  male: "a warm male vocal",
};

const clip = (s: string, max = 400) => s.trim().replace(/\s+/g, " ").slice(0, max);

/** 설문을 ElevenLabs 프롬프트로 바꾼다. 비교 시험에서 줄이 길어지는 경향이 있어 짧은 줄을 요구한다. */
export function buildPrompt(d: Draft): string {
  const call = callName(d);
  const lines = [
    `Write and perform ${GENRE_STYLE[d.genre] ?? GENRE_STYLE.ballad}, sung by ${VOCAL_STYLE[d.vocal] ?? "a warm vocal that suits the song"}.`,
    "It is a personalized gift song from one person to someone dear to them.",
    "All lyrics must be in natural, singable Korean with short lines and a clear repeated chorus. Structure: verse, chorus, verse, chorus, outro.",
    `Address the recipient as "${call}" in the lyrics${d.pronunciation.trim() ? ` (pronounced "${clip(d.pronunciation, 40)}")` : ""}.`,
  ];
  // 시험에서 이름을 주면 "김순자 엄마"처럼 후렴마다 반복해, 한두 번만 쓰도록 제한한다.
  if (d.name.trim() && d.name.trim() !== call) lines.push(`Their name is "${clip(d.name, 40)}"; use it at most twice and call them "${call}" otherwise.`);
  lines.push(`Relationship to the giver: ${clip(relationshipLabel(d), 40)}. Occasion: ${clip(reasonLabel(d), 80)}.`);
  if (d.traits.trim()) lines.push(`About them: ${clip(d.traits)}`);
  if (d.memory.trim()) lines.push(`Memories to include: ${clip(d.memory)}`);
  if (d.message.trim()) lines.push(`End with this message: "${clip(d.message, 200)}"`);
  if (d.exclude.trim()) lines.push(`Never mention: ${clip(d.exclude, 200)}`);
  lines.push("Use only the details given here and do not invent new events.");
  return lines.join("\n");
}

const LABELS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^verse\s*(\d+)?/i, (m) => `${m[1] ?? 1}절`],
  [/^pre-?chorus/i, () => "프리코러스"],
  [/^chorus/i, () => "후렴"],
  [/^bridge/i, () => "브릿지"],
  [/^intro/i, () => "도입"],
  [/^outro/i, () => "마무리"],
];

function koreanLabel(label: string): string {
  for (const [re, f] of LABELS) {
    const m = label.match(re);
    if (m) return f(m);
  }
  return label;
}

/** 응답의 composition_plan(실제로 부른 가사)을 화면용 가사로 바꾼다. */
export function planToLyrics(title: string, chunks: { text?: string }[]): Lyrics {
  const sections: LyricSection[] = [];
  for (const c of chunks) {
    const rows = (c.text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    const header = rows[0]?.match(/^\[(.+)\]$/);
    const lines = header ? rows.slice(1) : rows;
    if (lines.length) sections.push({ label: header ? koreanLabel(header[1]) : "가사", lines });
  }
  return { title, sections };
}

/** multipart/mixed 응답에서 JSON 메타데이터와 mp3를 꺼낸다. */
function splitMultipart(buf: Uint8Array, contentType: string): { json: unknown; audio: Uint8Array | null } {
  const boundary = /boundary="?([^";]+)"?/.exec(contentType)?.[1];
  if (!boundary) return { json: null, audio: buf };
  const bytes = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  const marker = Buffer.from(`--${boundary}`);
  let json: unknown = null;
  let audio: Uint8Array | null = null;
  let i = bytes.indexOf(marker);
  while (i !== -1) {
    const next = bytes.indexOf(marker, i + marker.length);
    if (next === -1) break;
    const part = bytes.subarray(i + marker.length, next);
    const split = part.indexOf("\r\n\r\n");
    const head = part.subarray(0, split).toString().toLowerCase();
    let body = part.subarray(split + 4);
    if (body.subarray(-2).toString() === "\r\n") body = body.subarray(0, -2);
    if (head.includes("application/json")) json = JSON.parse(body.toString());
    else if (head.includes("audio/")) audio = new Uint8Array(body);
    i = next;
  }
  return { json, audio };
}

async function finish(orderId: string, fields: Record<string, string | null>) {
  const db = await getDb();
  const keys = Object.keys(fields);
  await db
    .prepare(`UPDATE songs SET ${keys.map((k) => `${k} = ?`).join(", ")}, finished_at = ? WHERE order_id = ?`)
    .bind(...keys.map((k) => fields[k]), new Date().toISOString(), orderId)
    .run();
}

async function generate(env: CloudflareEnv, orderId: string, draft: Draft, fallbackTitle: string) {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ model_id: MODEL, prompt: buildPrompt(draft), music_length_ms: LENGTH_MS }),
    });
    if (!res.ok) {
      // 자동 재시도는 중복 과금 위험이 있어 하지 않는다. 운영자가 error를 보고 판단한다.
      return await finish(orderId, { status: "failed", error: `${res.status} ${(await res.text()).slice(0, 500)}` });
    }
    const { json, audio } = splitMultipart(new Uint8Array(await res.arrayBuffer()), res.headers.get("content-type") ?? "");
    if (!audio?.length) return await finish(orderId, { status: "failed", error: "no audio in response" });

    const meta = (json ?? {}) as { composition_plan?: { chunks?: { text?: string }[] }; song_metadata?: { title?: string } };
    const title = meta.song_metadata?.title?.trim() || fallbackTitle;
    const key = `songs/${orderId}.mp3`;
    await env.SONGS.put(key, audio, { httpMetadata: { contentType: "audio/mpeg" } });
    await finish(orderId, {
      status: "ready",
      title,
      lyrics_json: JSON.stringify(planToLyrics(title, meta.composition_plan?.chunks ?? [])),
      audio_key: key,
      provider_song_id: res.headers.get("song-id"),
      error: null,
    });
  } catch (e) {
    await finish(orderId, { status: "failed", error: String(e).slice(0, 500) }).catch(() => {});
  }
}

/**
 * 결제된 주문의 노래 제작을 시작한다. 주문당 한 번만 실행된다.
 * MUSIC_GENERATION이 "on"이 아니면 과금 없이 disabled로만 기록한다(실제 결제 연결 전 남용 방지).
 */
export async function startSong(orderId: string, draft: Draft, fallbackTitle: string): Promise<void> {
  const { env, ctx } = await getCloudflareContext({ async: true });
  const db = await getDb();
  const enabled = (env.MUSIC_GENERATION as string) === "on" && Boolean(env.ELEVENLABS_API_KEY);
  const claimed = await db
    .prepare("INSERT INTO songs (order_id, status, started_at) VALUES (?, ?, ?) ON CONFLICT(order_id) DO NOTHING")
    .bind(orderId, enabled ? "generating" : "disabled", new Date().toISOString())
    .run();
  if (!enabled || !claimed.meta.changes) return;
  // 응답을 보낸 뒤에도 생성이 이어지도록 waitUntil에 맡긴다. 보통 10~15초 걸린다.
  ctx.waitUntil(generate(env, orderId, draft, fallbackTitle));
}
