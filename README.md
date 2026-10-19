# Only U song

소중한 한 사람의 이야기로 만드는 맞춤 노래 선물 서비스 — **1단계 화면 시제품**입니다.
실제 결제·AI 가사 생성·음악 제작은 연결되어 있지 않고, 입력 내용은 브라우저(localStorage)에 7일간만 저장됩니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

## 화면 흐름

| 주소 | 화면 |
| --- | --- |
| `/` | 메인: 핵심 문구·샘플·이용 방법·관계별 시작·가격·FAQ |
| `/create` | 8단계 설문 (`/create?for=mom`처럼 받는 분 미리 선택 가능) |
| `/draft` | 무료 가사 미리보기·직접 수정·다시 쓰기(2회)·확정 |
| `/checkout` | 주문 확인·모의 결제 |
| `/orders` | 제작 상태 (시제품은 3초마다 단계 진행) |
| `/songs` | 내 노래: 플레이어·가사·선물 링크 |
| `/gift` | 받는 사람용 선물 페이지 (봉투 열기) |

## 다음 단계에서 교체할 부분

- `src/lib/draft.ts`의 `generateLyrics` → 서버의 AI 가사 생성 (ElevenLabs 계획 API 또는 Claude API)
- 모의 결제 → 국내 PG + 서버 검증
- `MockPlayer` → 실제 음원 재생, MP3 다운로드
- localStorage → DB(Supabase 등)와 이메일 인증

## Cloudflare 배포

Cloudflare Workers에 [OpenNext](https://opennext.js.org/cloudflare)로 배포합니다. 설정은 `wrangler.jsonc`, `open-next.config.ts`에 있습니다.

```bash
npm run preview   # Cloudflare 런타임으로 로컬 확인
npm run deploy    # 직접 배포 (wrangler 로그인 필요)
```

대시보드에서 GitHub로 연결할 때(Workers Builds)는 다음 값을 사용합니다.

- 프로젝트(Worker) 이름: `only-you` (`wrangler.jsonc`의 `name`과 같아야 함)
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`

## 데이터 저장 (Cloudflare D1)

결제(시제품) 후 주문·가사는 D1 데이터베이스 `only-u-song-db`(바인딩 `DB`)에 저장됩니다.

- 배포 시 wrangler가 DB가 없으면 자동으로 만듭니다. 테이블은 서버가 처음 요청을 받을 때 `CREATE TABLE IF NOT EXISTS`로 만듭니다 (스키마: `migrations/0001_orders.sql`).
- `/api/orders` — 주문 저장, `/api/orders/[id]` — 주문 조회·선물 링크 켜고 끄기 (`x-owner-token` 헤더 필요)
- `/gift/[token]` — 받는 사람 페이지. 노래·가사·전하는 말만 보여 주고 이메일·원래 사연은 보내지 않습니다.
- 바인딩을 바꾸면 `npx wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts`로 타입을 다시 만듭니다.
