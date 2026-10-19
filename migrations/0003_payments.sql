-- 주문의 결제 상태. 서버(src/lib/db.ts)가 시작 시 같은 스키마를 IF NOT EXISTS로 보장한다.
-- 이 테이블이 생기기 전의 주문(행 없음)은 모의 결제로 이미 결제된 것으로 본다.
CREATE TABLE IF NOT EXISTS payments (
  order_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,   -- payapp | mock
  status TEXT NOT NULL,     -- ready | paid | cancelled
  amount INTEGER NOT NULL,
  provider_ref TEXT,        -- 페이앱 결제요청번호(mul_no)
  created_at TEXT NOT NULL,
  paid_at TEXT
);
