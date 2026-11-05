-- 자동 안내 메일 발송 기록(오픈 기념 무료 반응 영상 기한 안내 등). 주문 · 종류마다 한 번만 보낸다.
-- 서버(src/lib/db.ts)가 시작 시 같은 스키마를 IF NOT EXISTS로 보장한다.
CREATE TABLE IF NOT EXISTS reminders (
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL,        -- promo_d3 | promo_d1
  sent_at TEXT NOT NULL,
  PRIMARY KEY (order_id, kind)
);
