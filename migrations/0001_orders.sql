-- 결제 완료된 주문. 서버(src/lib/db.ts)가 시작 시 같은 스키마를 IF NOT EXISTS로 보장한다.
CREATE TABLE IF NOT EXISTS orders (
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
);
