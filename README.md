# Only You

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
