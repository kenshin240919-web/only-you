-- 주문마다 한 번 만드는 노래. 서버(src/lib/db.ts)가 시작 시 같은 스키마를 IF NOT EXISTS로 보장한다.
-- order_id가 기본 키라서 같은 주문으로 두 번 생성(중복 과금)되지 않는다.
CREATE TABLE IF NOT EXISTS songs (
  order_id TEXT PRIMARY KEY,
  status TEXT NOT NULL, -- generating | ready | failed | disabled
  title TEXT,
  lyrics_json TEXT,
  audio_key TEXT,
  provider_song_id TEXT,
  error TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);
