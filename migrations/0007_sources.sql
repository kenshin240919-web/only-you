-- 유입 경로(?src=)별 방문·주문 집계. 서버(src/lib/db.ts)가 시작 시 같은 스키마를 IF NOT EXISTS로 보장한다.
-- 방문은 브라우저 세션당 1번, 한국 날짜·경로별 합계만 남긴다(개인 식별 정보 없음).
CREATE TABLE IF NOT EXISTS visits (
  day TEXT NOT NULL,        -- 한국 날짜 YYYY-MM-DD
  src TEXT NOT NULL,        -- 유입 경로. 없으면 direct
  n INTEGER NOT NULL,
  PRIMARY KEY (day, src)
);

-- 주문이 어느 경로로 들어왔는지. 경로를 모르는 주문(이 표 이전 주문 포함)은 행이 없다.
CREATE TABLE IF NOT EXISTS order_sources (
  order_id TEXT PRIMARY KEY,
  src TEXT NOT NULL
);
