import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type Draft, type Lyrics, callName, genreLabel } from "./draft";

export type OrderRow = {
  id: string;
  owner_token_hash: string;
  gift_token: string;
  gift_enabled: number;
  order_no: string;
  email: string;
  draft_json: string;
  lyrics_json: string;
  created_at: string;
  paid_at: string;
};

export type SongRow = {
  order_id: string;
  status: "generating" | "ready" | "failed" | "disabled";
  title: string | null;
  lyrics_json: string | null;
  audio_key: string | null;
  provider_song_id: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

/** 화면에 보여 줄 노래 상태. 실패 사유(error)는 운영자만 DB에서 본다. */
export type SongView = {
  status: SongRow["status"] | "none";
  title: string | null;
  lyrics: Lyrics | null;
};

/** 받는 사람에게 보여 줘도 되는 정보만 담는다. 이메일·원래 사연은 넣지 않는다. */
export type GiftView = {
  title: string;
  lyrics: Lyrics;
  callName: string;
  genre: string;
  message: string;
  hasAudio: boolean;
};

// migrations/0001_orders.sql과 같은 스키마. 대시보드에서 마이그레이션을 따로 실행하지 않아도 되도록 보장한다.
const SCHEMA = `CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  owner_token_hash TEXT NOT NULL,
  gift_token TEXT NOT NULL UNIQUE,
  gift_enabled INTEGER NOT NULL DEFAULT 1,
  order_no TEXT NOT NULL,
  email TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  lyrics_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  paid_at TEXT NOT NULL
)`;

// migrations/0002_songs.sql과 같은 스키마.
const SONGS_SCHEMA = `CREATE TABLE IF NOT EXISTS songs (
  order_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  title TEXT,
  lyrics_json TEXT,
  audio_key TEXT,
  provider_song_id TEXT,
  error TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
)`;

// 생성 요청이 이 시간 안에 끝나지 않으면 작업이 중단된 것으로 본다.
const STALE_MS = 10 * 60 * 1000;

let schemaReady: Promise<unknown> | null = null;

export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!schemaReady) {
    schemaReady = env.DB.batch([env.DB.prepare(SCHEMA), env.DB.prepare(SONGS_SCHEMA)]).catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  await schemaReady;
  return env.DB;
}

export function randomToken(bytes = 24): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 주문 소유자 토큰이 맞을 때만 주문을 돌려준다. */
export async function getOwnedOrder(id: string, ownerToken: string | null): Promise<OrderRow | null> {
  if (!ownerToken) return null;
  const db = await getDb();
  const row = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<OrderRow>();
  if (!row) return null;
  return row.owner_token_hash === (await hashToken(ownerToken)) ? row : null;
}

export async function getSong(orderId: string): Promise<SongRow | null> {
  const db = await getDb();
  return db.prepare("SELECT * FROM songs WHERE order_id = ?").bind(orderId).first<SongRow>();
}

export function songView(row: SongRow | null): SongView {
  if (!row) return { status: "none", title: null, lyrics: null };
  const stale = row.status === "generating" && Date.now() - new Date(row.started_at).getTime() > STALE_MS;
  return {
    status: stale ? "failed" : row.status,
    title: row.title,
    lyrics: row.lyrics_json ? (JSON.parse(row.lyrics_json) as Lyrics) : null,
  };
}

/** 선물 링크가 켜진 주문만 찾는다. */
export async function getGiftOrder(giftToken: string): Promise<Pick<OrderRow, "id" | "draft_json" | "lyrics_json"> | null> {
  const db = await getDb();
  return db
    .prepare("SELECT id, draft_json, lyrics_json FROM orders WHERE gift_token = ? AND gift_enabled = 1")
    .bind(giftToken)
    .first<Pick<OrderRow, "id" | "draft_json" | "lyrics_json">>();
}

export async function getGift(giftToken: string): Promise<GiftView | null> {
  const row = await getGiftOrder(giftToken);
  if (!row) return null;
  const draft = JSON.parse(row.draft_json) as Draft;
  const song = songView(await getSong(row.id));
  // 노래가 완성되면 실제로 부른 가사를 보여 준다.
  const lyrics = song.lyrics ?? (JSON.parse(row.lyrics_json) as Lyrics);
  return {
    title: song.title ?? lyrics.title,
    lyrics,
    callName: callName(draft),
    genre: genreLabel(draft),
    message: draft.message.trim(),
    hasAudio: song.status === "ready",
  };
}
