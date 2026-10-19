# 결정 기록

## 2026-10-19 가사 작성: ElevenLabs에 맡김 (A안) — 나중에 B안으로 바꿀 수 있음

**결정**: 가사는 ElevenLabs 음악 API가 사연을 받아 직접 쓰게 한다. 추가 API 비용이 없기 때문이다.
가사 무료 미리보기는 두지 않는다(벤치마킹 대상 서비스와 같은 방식). 이름·사연 오류 위험은 제작 전 운영자 가사 검수나 수정 정책으로 줄인다.

| | A안: ElevenLabs가 가사 작성 (채택) | B안: Claude가 가사 작성 → ElevenLabs가 부름 |
|---|---|---|
| 호출 | `POST /v1/music/detailed` 에 `prompt`(사연·호칭·구성) + `music_length_ms` | Claude API로 가사 생성 → `POST /v1/music` 에 `composition_plan.chunks` |
| 추가 비용 | 없음 (ElevenLabs 크레딧 안) | Claude API 사용료 (단가 확인 필요) |
| 가사 확인 | 응답 JSON의 `composition_plan`에 가사, `song_metadata`에 제목이 들어 있음 | 생성 전에 가사를 알 수 있어 미리보기·수정이 쉬움 |
| 시험 결과 | 사연을 빠짐없이 담음. 구간마다 긴 문장 6줄로 편지체에 가까움, 사연에 없는 내용 일부 추가 | 구간마다 짧은 4줄, 후렴 반복이 뚜렷함. 사연은 다소 압축 |

시험 조건: 같은 사연(딸 → 아빠 환갑, 자전거·파란 우산 추억), `music_v2_5`, 2분 30초, Starter 플랜.
생성 시간 A 13.4초 / B 10.1초, 둘 다 오류 없음. 재현: `node tools/music-test/compare-lyrics.mjs` (과금됨, 2곡 × 2.5분).

**B안으로 바꿀 때 고려할 점**
- A안 가사가 노래에서 몰리거나 뭉개진다는 고객 반응이 나오면 B안을 검토한다.
- 사연에 없는 내용이 추가되는 것이 문제가 되면 B안을 검토한다.
- 가사 미리보기를 다시 넣고 싶을 때도 B안이 필요하다. `/draft` 화면이 이 흐름을 위해 만들어져 있다.
- 바꾸는 범위: `src/lib/music.ts`의 `generate`에서 Claude API로 가사를 먼저 만들고, 음악 호출을 `prompt`에서 `composition_plan`으로 바꾼다. B안 가사 예시와 구간 구성은 `tools/music-test/compare-lyrics.mjs`의 `lyricsB`, `cases.json`에 있다.
