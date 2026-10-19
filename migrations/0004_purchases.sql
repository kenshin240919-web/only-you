-- 주문마다 여러 번 결제할 수 있다(처음 주문, MP3·가사 카드 추가, 유료 수정). 0003의 payments 테이블을 대신한다.
-- 서버(src/lib/db.ts)가 시작 시 같은 스키마를 IF NOT EXISTS로 보장한다.
-- 결제 기록이 하나도 없는 주문은 이 테이블 이전의 시제품 주문이라 모든 상품을 가진 것으로 본다.
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  items TEXT NOT NULL,      -- JSON 배열: song | mp3 | card | revision
  amount INTEGER NOT NULL,
  provider TEXT NOT NULL,   -- payapp | mock
  status TEXT NOT NULL,     -- ready | paid | cancelled
  provider_ref TEXT,        -- 페이앱 결제요청번호(mul_no)
  created_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS purchases_order ON purchases(order_id);

-- 노래 수정 요청. 유료 수정은 결제가 확인된 뒤에 시작한다(awaiting_payment → started).
CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  paid INTEGER NOT NULL,    -- 0 무료, 1 유료
  purchase_id TEXT,
  request_json TEXT NOT NULL,
  status TEXT NOT NULL,     -- awaiting_payment | started | cancelled
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS revisions_order ON revisions(order_id);
