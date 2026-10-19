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

- 가사·음악 생성 → ElevenLabs가 사연으로 가사까지 작성(A안, 추가 비용 없음). 결정 근거와 Claude 가사(B안)로 바꾸는 방법은 [`docs/DECISIONS.md`](docs/DECISIONS.md)
- 모의 결제 → 국내 PG + 서버 검증
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

## 노래 생성 (ElevenLabs)

결제(시제품)로 주문이 저장되면 서버가 사연을 ElevenLabs 음악 API에 보내 가사와 노래(2분 30초)를 함께 만듭니다. 코드는 `src/lib/music.ts`입니다.

- 완성된 mp3는 R2 버킷 `only-u-song-audio`(바인딩 `SONGS`)에, 상태·실제 가사는 D1 `songs` 테이블(`migrations/0002_songs.sql`)에 저장됩니다.
- 주문당 한 번만 생성하며, 실패해도 자동으로 다시 요청하지 않습니다(중복 과금 방지). 실패 사유는 `songs.error`에 남습니다.
- **기본은 꺼져 있습니다.** 실제 결제를 연결하기 전에는 누구나 모의 결제로 생성을 일으킬 수 있으므로, 시험할 때만 켭니다.
  1. API 키 등록: `npx wrangler secret put ELEVENLABS_API_KEY` (또는 대시보드 → Worker → Settings → Variables and Secrets)
  2. `wrangler.jsonc`의 `vars.MUSIC_GENERATION`을 `"on"`으로 바꿔 배포
- 로컬 시험: `.dev.vars`에 `ELEVENLABS_API_KEY="..."`, `MUSIC_GENERATION="on"`을 넣고 `npm run preview`. 한 곡에 Starter 분량 2.5분이 쓰입니다.
