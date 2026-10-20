-- 주문 찾기(주문번호 + 이메일)로 다른 기기에 발급한 접근 토큰. 원래 기기의 토큰(orders.owner_token_hash)은 그대로 둔다.
CREATE TABLE IF NOT EXISTS order_access (
  token_hash TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 주문 찾기 실패 기록. 무작위 대입을 막는 데만 쓰고 하루가 지나면 지운다. IP는 복원할 수 없는 해시로 저장한다.
CREATE TABLE IF NOT EXISTS find_attempts (
  key TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS find_attempts_key ON find_attempts(key, created_at);
