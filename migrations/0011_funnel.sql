-- 단계별 숫자(만들기 시작 · 주문 확인 도착). 브라우저 세션당 단계마다 1번, 한국 날짜별 합계만 남긴다(개인 식별 정보 없음).
-- 서버(src/lib/db.ts)가 시작 시 같은 스키마를 IF NOT EXISTS로 보장한다. 방문은 visits, 주문 · 결제는 orders · purchases에서 센다.
CREATE TABLE IF NOT EXISTS funnel (
  day TEXT NOT NULL,
  step TEXT NOT NULL,        -- create(이야기 쓰기 시작) | checkout(주문 확인 화면 도착)
  n INTEGER NOT NULL,
  PRIMARY KEY (day, step)
);
