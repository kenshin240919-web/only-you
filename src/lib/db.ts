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

/** 받는 사람에게 보여 줘도 되는 정보만 담는다. 이메일·원래 사연은 넣지 않는다. */
export type GiftView = {
  title: string;
  lyrics: Lyrics;
  callName: string;
  genre: string;
  message: string;
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

let schemaReady: Promise<unknown> | null = null;

export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!schemaReady) {
    schemaReady = env.DB.prepare(SCHEMA).run().catch((e) => {
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

export async function getGift(giftToken: string): Promise<GiftView | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT draft_json, lyrics_json FROM orders WHERE gift_token = ? AND gift_enabled = 1")
    .bind(giftToken)
    .first<Pick<OrderRow, "draft_json" | "lyrics_json">>();
  if (!row) return null;
  const draft = JSON.parse(row.draft_json) as Draft;
  const lyrics = JSON.parse(row.lyrics_json) as Lyrics;
  return { title: lyrics.title, lyrics, callName: callName(draft), genre: genreLabel(draft), message: draft.message.trim() };
}
