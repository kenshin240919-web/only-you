# Only U song

소중한 한 사람의 이야기로 만드는 맞춤 노래 선물 서비스 — **1단계 화면 시제품**입니다.
실제 결제는 연결되어 있지 않고, 입력 내용은 브라우저(localStorage)에 7일간만 저장됩니다.

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
| `/checkout` | 주문 확인·모의 결제 |
| `/orders` | 제작 상태 (시제품은 3초마다 단계 진행) |
| `/songs` | 내 노래: 플레이어·가사·선물 링크 |
| `/gift` | 받는 사람용 선물 페이지 (봉투 열기) |

## 다음 단계에서 교체할 부분

- 가사·음악 생성 → ElevenLabs가 사연으로 가사까지 작성(A안, 추가 비용 없음). 결정 근거와 Claude 가사(B안)로 바꾸는 방법은 [`docs/DECISIONS.md`](docs/DECISIONS.md)
- localStorage → DB(Supabase 등)와 이메일 인증

## Cloudflare 배포

- **대시보드에서 비밀 값을 바꾸면 "저장" 뒤에 배포 탭에서 그 버전을 "버전 승격"해야 적용된다.** (2026-10-26 ElevenLabs 키 교체 때 확인)

사이트 주소는 **https://song.guidejung.com** 입니다(Worker 사용자 지정 도메인). 예전 `only-you.kenshin240919.workers.dev` 주소도 계속 열려 있습니다.

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

## 결제 (페이앱)

saju.guidejung.com과 같은 페이앱 판매자 계정·방식으로 건별 결제를 받습니다. 코드는 `src/lib/payapp.ts`, `src/app/api/payapp/`입니다.

- 결제 화면에서 휴대폰 번호(페이앱 필수값, 저장하지 않음)를 받아 결제 대기 주문을 만들고 페이앱 결제창으로 보냅니다. 금액은 서버(`src/lib/pricing.ts`)가 정합니다.
- 주문 하나에 여러 번 결제합니다(처음 주문, MP3·가사 카드 추가, 유료 수정). 결제 기록은 D1 `purchases`, 수정 요청은 `revisions` 테이블(`migrations/0004_purchases.sql`)에 남습니다. 가격 정책은 `docs/DECISIONS.md`.
- 결제 완료는 페이앱 알림(`/api/payapp/feedback`)이 판매자 연동값·결제요청번호·금액이 모두 맞을 때만 인정하고, 그때 노래 제작을 시작합니다. 취소·환불 알림이 오면 결제를 취소 상태로 바꾸고 선물 링크를 끕니다.
- **기본은 모의 결제입니다.** 켜려면:
  1. 페이앱 판매자 사이트 → 설정 → 연동 정보의 아이디·연동 KEY·연동 VALUE를 Worker 비밀 값으로 등록: `PAYAPP_USERID`, `PAYAPP_LINKKEY`, `PAYAPP_LINKVAL` (대시보드 → Worker → Settings → Variables and Secrets)
  2. `wrangler.jsonc`의 `vars.PAYMENT_MODE`를 `"payapp"`으로 바꿔 배포
- 결제를 켠 뒤 노래 제작까지 하려면 `MUSIC_GENERATION`도 `"on"`이어야 합니다(위 "노래 생성" 참고).

이용약관·개인정보처리방침·환불 정책은 `/terms`, `/privacy`, `/refund`에 있고, 사업자 정보는 `src/lib/business.ts` 한 곳에서 관리합니다.

## 관리자 화면 (`/admin`)

주문·결제·제작 상태를 보고 운영 조치를 합니다. 화면 메뉴에는 없고 주소로 들어갑니다.

- 켜기: Cloudflare 비밀 값 `ADMIN_PASSWORD`(12자 이상)를 등록합니다. 없으면 관리자 화면과 API가 모두 꺼집니다. 로그인하면 12시간 유지되는 쿠키를 받습니다.
- 요약: 오늘·이번 달(한국 시간) 주문 수와 결제 금액, 이번 달 ElevenLabs 사용량(생성 1회 2.5분, `generations` 테이블), 제작 실패 건수.
- 주문 목록: 주문번호·이메일 검색, 실패만 보기.
- 주문 상세: 사연, 결제 내역, 수정 내역, 제작 오류, 음원 듣기, 가사.
- 조치:
  - **무료로 다시 만들기**: 제작 실패나 우리 잘못(이름·호칭 오류, 추억 누락)일 때. 고객 수정 횟수에 들어가지 않고 크레딧 2.5분을 씁니다.
  - **취소로 표시**: 환불은 페이앱 판매자 화면에서 하고, 취소 알림이 오면 자동 반영됩니다. 반영되지 않았을 때만 씁니다(돈을 돌려주지는 않음).
  - **선물 링크 켜기·끄기**

## 유입 경로 (`?src=`)

- 홍보 링크 뒤에 `?src=이름`(영문 소문자·숫자·`-`·`_`, 24자까지)을 붙이면 관리자 화면 "유입 경로" 표에 방문·주문·결제·매출이 따로 집계됩니다. 예: `https://song.guidejung.com/?src=insta`
- `?src`가 없으면 이전 사이트 주소로 짐작합니다(네이버·구글·인스타그램·사주 이루리라 등, 모르면 `other`, 알 수 없으면 `direct`).
- 경로는 그 기기에 30일 동안 기억되고 주문할 때 `order_sources`에 남습니다. 방문은 브라우저 세션당 1번, 날짜·경로별 합계(`visits`)만 저장합니다. 스키마: `migrations/0007_sources.sql`.

## 후기 이벤트 · 무료 노래 쿠폰 · 후기 코너

- 안내: `/review-event`, 후기 코너: `/stories`(RSS `/stories/rss.xml`). 완성 메일과 '내 노래' 화면에 이벤트 안내가 붙는다.
- 손님이 카카오톡 채널(`src/lib/business.ts`의 `kakaoChannel`, 비어 있으면 이메일)로 후기를 보내면, 관리자 주문 상세의 **후기 혜택** 버튼으로 지급한다(주문자에게 메일).
  - 반응 영상: 노래만 산 주문은 MP3 + 가사 카드(0원 구매 `provider = reward`), 올인원 주문은 다음 노래 1곡 무료 쿠폰(`SONG-XXXX-XXXX`, 1년, 노래 듣기만)
  - 글·사진 후기: 가사 카드. 주문당 종류별 1번(`rewards`).
  - 혜택으로 받은 MP3·가사 카드는 올인원 혜택(수정 3회 무료)에 넣지 않는다(`ownership().bought`).
  - 노래 결제가 취소되면 혜택 구매는 취소, 쓰지 않은 쿠폰은 만료된다.
- 쿠폰은 주문 확인 화면의 "무료 노래 쿠폰" 칸에 넣으면 추가 상품 없이 0원 주문(`provider = coupon`)이 된다.
- 후기 코너 글·영상은 관리자 화면 "후기 코너 올리기"에서 게시 동의를 확인하고 올린다(영상 95MB까지, R2 `reviews/`). 숨기기·지우기(영상 파일도 삭제) 가능.
- 스키마: `migrations/0008_rewards.sql`.

## 알림 메일 (Cloudflare Email Service)

Workers 유료 플랜에 월 3,000통이 포함된 Cloudflare Email Service로 보냅니다(초과 시 1,000통당 $0.35, 2026-10 기준 베타). 코드는 `src/lib/mail.ts`입니다.

- 노래 완성: 주문자에게 주문번호, `/find?no=주문번호` 링크(다른 기기에서 열기), 선물 링크(켜져 있을 때). 수정본·재제작본이 완성돼도 보냅니다.
- 제작 실패: 주문자에게 "확인 후 다시 만들어 드림" 안내, 운영자(`ADMIN_EMAIL`)에게 오류 내용과 관리자 화면 링크.
- **2026-10-20 켬**: 보내는 주소 `noreply@song.guidejung.com`(이메일 서비스에 `song.guidejung.com` 등록, DKIM·SPF·DMARC 확인). 관리자 화면의 '알림 메일 시험 발송'으로 `ADMIN_EMAIL`에 시험 메일을 보낼 수 있습니다.
- 다른 도메인으로 바꾸려면:
  1. Cloudflare 대시보드 → 이메일 서비스에서 보내는 도메인(정식 도메인)을 등록하고 안내되는 DNS 레코드를 추가
  2. `wrangler.jsonc`에 `"send_email": [{ "name": "EMAIL" }]`를 추가하고 `vars.MAIL_FROM`을 그 도메인 주소(예: `noreply@도메인`)로, `vars.SITE_URL`을 정식 주소로 바꿔 배포
- 메일 발송이 실패해도 주문·제작은 그대로 진행됩니다(로그에만 남음).
