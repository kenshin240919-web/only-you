-- ElevenLabs 생성 요청 1회마다 한 줄. 관리자 화면의 이번 달 사용량(곡당 2.5분) 계산에 쓴다.
-- kind: first(처음 제작) | revision(고객 수정) | admin(관리자 재제작)
CREATE TABLE IF NOT EXISTS generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL
);
