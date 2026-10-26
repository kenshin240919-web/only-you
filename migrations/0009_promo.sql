-- 오픈 기념 선착순 무료(2026-10-26). 서버(src/lib/db.ts)가 시작 시 같은 스키마를 IF NOT EXISTS로 보장한다.
-- 관리자 화면에서 켜고 끄며, 인원(promo_limit)이 차면 자동으로 받지 않는다.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 무료로 받은 주문. 같은 행사에서 같은 이메일은 한 번만.
CREATE TABLE IF NOT EXISTS promo_claims (
  campaign TEXT NOT NULL,
  email TEXT NOT NULL,
  order_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (campaign, email)
);
