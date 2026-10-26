-- 관리자가 직접 정한 노래 듣기 정지·다시 열기. 서버(src/lib/db.ts)가 시작 시 같은 스키마를 IF NOT EXISTS로 보장한다.
-- 행이 없으면 자동 규칙(오픈 기념 무료는 신청 후 7일 안에 반응 영상이 없으면 정지)을 따른다.
CREATE TABLE IF NOT EXISTS song_locks (
  order_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,       -- locked(정지) | open(기한과 관계없이 열기)
  updated_at TEXT NOT NULL
);
