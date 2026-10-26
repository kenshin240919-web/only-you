-- 후기 이벤트 혜택 · 무료 노래 쿠폰 · 후기 코너. 서버(src/lib/db.ts)가 시작 시 같은 스키마를 IF NOT EXISTS로 보장한다.

-- 주문당 혜택 지급 기록. 같은 종류는 한 번만 준다(video: 반응 영상, text: 글·사진 후기).
CREATE TABLE IF NOT EXISTS rewards (
  order_id TEXT NOT NULL,
  kind TEXT NOT NULL,        -- video | text
  benefit TEXT NOT NULL,     -- addons(MP3+가사 카드) | card | coupon
  coupon_code TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (order_id, kind)
);

-- 무료 노래 쿠폰(노래 듣기만, MP3·가사 카드 제외). 한 번 쓰면 used_order_id가 채워진다.
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  kind TEXT NOT NULL,        -- free_song
  source_order_id TEXT,      -- 어떤 주문의 후기로 받았는지
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_order_id TEXT,
  used_at TEXT
);

-- 후기 코너(/stories)에 올리는 후기. 영상은 R2(reviews/{id}.{ext})에 둔다.
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  name TEXT NOT NULL,        -- 표시 이름(예: 최○○님)
  occasion TEXT NOT NULL,    -- 예: 엄마 생신 선물
  body TEXT NOT NULL,
  video_key TEXT,
  video_type TEXT,
  rewarded INTEGER NOT NULL, -- 혜택을 받고 쓴 후기면 1(화면에 표시)
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
