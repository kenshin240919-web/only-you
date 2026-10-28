# 온리유송 릴스 실행 방법 (컴퓨터 Claude Code)

사주 이루리라 릴스(`saju/docs/plans/reels-daily-run.md`)와 같은 방식이고, **크롬 · 계정 · 음원**만 다르다.

## 0. 준비 (처음 한 번)
- **온리유송 크롬**: 바탕화면 "온리유송 크롬"(`chrome.exe --profile-directory="OnlyU"`). Claude 확장 · 자동 번역 끔.
  로그인: Flow(구독 구글 계정) · 유튜브(채널 **@onlyusong**로 전환) · 인스타 **onlyu.song** · 틱톡 **@only.u.song** · 스레드(인스타로 로그인).
- **사주 릴스 크롬과 동시에 켜지 않는다.** 작업 중에는 이 창을 맨 앞에 둔다(가려지면 캡처 · 클릭 실패).
- 저장소: `git clone https://github.com/kenshin240919-web/only-you.git` (이미 있으면 `git pull`)
- 필요한 것: Python(Pillow), ffmpeg(사주 릴스와 같음), 글꼴 `C:\Users\User\AppData\Local\Microsoft\Windows\Fonts\Jalnan2TTF.ttf`

## 1. 영상 만들기 규칙
- Flow: 동영상 · **9:16 · 8초 · 1개 · 가장 싼 모델 · 360p**(Omni 1.1 Flash, 클립 1개 6크레딧)
- **길이는 32초 고정: 클립 4개, 자막 4초씩 8장면**(2026-10-28 결정, 16초는 안 만든다). 아래 1편 지시문은 처음 쓴 16초판이라, 클립 2개를 더 기획해(이야기가 이어지게) 32초로 만든다
- 합치기: `python tools/reels/make-song-reel.py --subs subs.json --font <잘난체2> --audio public/samples/<곡>.mp3 --audio-start <초> --out final.mp4 clip1.mp4 clip2.mp4 clip3.mp4 clip4.mp4`
  - Flow 효과음은 버리고 **우리 샘플 노래**를 깐다(플랫폼 음악 · 사운드는 고르지 않는다)
  - 검은 칸 아래에 "Only U song 온리유송 · 예시 사연 · AI로 만든 노래"가 자동으로 들어간다
- 영상 · 원고 파일: `reels/out/YYYY-MM-DD_이름/` (git 제외)
- 업로드 순서: 유튜브 → 인스타 → 틱톡. 틱톡은 비즈니스 계정 승인 전이라 프로필 링크가 없으니 글에 "프로필 링크" 대신 **"온리유송" 검색 · song.guidejung.com**을 적는다(2026-10-28).
- 올리기 전 계정 이름 확인, AI 표시 켜기
- 홍보 문구는 "이름"보다 **"둘만 아는 추억"** 중심(2026-10-28 결정)

## 2. 1편 지시문 (엄마 · 「고마워요, 엄마」)
아래를 컴퓨터 Claude Code(`claude --chrome`, 온리유송 크롬)에 그대로 붙여 넣는다.

```
only-you 저장소 폴더에서 git pull 하고 docs/plans/reels-run.md를 읽은 뒤, 온리유송 릴스 1편을 처음부터 끝까지 진행해 줘.
각 단계 결과를 캡처로 보여 주고, 막히면 멈추고 알려 줘.
먼저 연결된 크롬이 "온리유송 크롬"(프로필 OnlyU)인지 확인해 줘: 인스타 계정이 onlyu.song으로 보이는지 캡처. 다른 크롬(특히 irurira1000)이면 아무것도 하지 말고 멈춤.

[하지 말 것]
- 결제 · 구독 · 크레딧 구매(창이 뜨면 멈춤), 게시물 삭제 · 수정, 계정 설정 변경, 좋아요 · 팔로우, 플랫폼 음악 · 사운드 선택

[1. Flow 영상] https://flow.google.com/ → 새 프로젝트 "onlyu-01-mom" → 동영상 · 9:16 · 8초 · 1개 · 가장 싼 모델 · 360p · 다운로드는 "360p 원본 크기"
- 클립1 프롬프트: A small Korean apartment kitchen before dawn, a single warm light glowing above the stove in the dark, steam slowly rising from a pot of soup, a mother's hands packing rice into a lunch box, quiet and tender mood. Vertical, cinematic, soft warm light, shallow depth of field, slow push-in, no text, no visible faces.
- 클립2 프롬프트: Early morning at the front door of a Korean apartment, a mother's hand gently handing a wrapped lunch box to a young student's hand, sunrise glow from outside, warm and grateful mood. Vertical, cinematic, soft natural light, slow camera movement, no text, no visible faces.
- 두 클립 다운로드 → reels/out/[오늘날짜]_mom/clip1.mp4, clip2.mp4

[2. 합치기] tools/reels/make-song-reel.py, 노래 public/samples/mom.mp3, --audio-start 44.5 (후렴 "고마워요 엄마" 부분)
- subs.json:
  0~4초: 엄마와의 추억 한 줄로 / 노래를 만들었어요
  4~8초: 새벽 부엌 불빛, 도시락 / 그 추억이 노래가 됐어요
  8~12초: 사연 쓰고 1분이면 / 엄마만의 노래 완성
  12~16초: 엄마 생신 선물로 / 프로필 링크에서
- 출력 final.mp4 → 1 · 6 · 10 · 14초 캡처를 보여 주고 "올릴까요?" 물어보기.
  (나는 final.mp4를 직접 들어 보고, 노래가 어색하게 시작하면 --audio-start 값을 바꿔 달라고 할 수 있음)

[3. 업로드] 순서: 유튜브 → 인스타 → 틱톡. 각 플랫폼마다 계정 이름 먼저 확인
- 유튜브(@onlyusong) Shorts
  제목: 엄마와의 추억 한 줄로 노래를 만들었어요 🎤 #노래선물 #shorts
  설명: 둘만 아는 추억 몇 줄을 적으면 AI가 1분 만에 그 사람만의 노래를 만들어 드려요. (예시 사연 · AI로 만든 노래)\n노래 만들기 👉 https://song.guidejung.com/?src=youtube
  태그: 노래선물, 맞춤노래, 부모님선물, 엄마생신선물, 추억선물, AI노래
  아동용 아님 · 공개 · "변경되거나 합성된 콘텐츠" 예
- 인스타(onlyu.song) 릴스, 자르기 "원본", AI 레이블 켬, 음악 추가 안 함
  캡션: 엄마와의 추억 한 줄로 노래를 만들었어요 🎤\n새벽마다 부엌 불을 켜고 도시락을 싸 주던 엄마.\n그 추억이 1분 만에 노래가 됐어요.\n\n🎉 오픈 기념 선착순 무료 · 프로필 링크에서\n(예시 사연 · AI로 만든 노래)\n\n#노래선물 #맞춤노래 #추억선물 #부모님선물 #엄마생신선물 #생일선물 #AI노래
  첫 댓글: 여러분은 엄마와 어떤 추억이 떠오르세요? 💛
- 틱톡(@only.u.song), AI 생성 콘텐츠 켬 · 모두 공개, 사운드 추가 안 함
  설명: 엄마와의 추억 한 줄로 노래를 만들었어요 🎤 노래 만들기는 "온리유송" 검색 · song.guidejung.com #노래선물 #맞춤노래 #추억선물 #부모님선물 #엄마생신선물
  첫 댓글: 엄마와 어떤 추억이 떠오르세요? 💛 노래 만들기는 "온리유송" 검색 🎁

[4. 보고] 세 링크 + 헤맨 곳. 새로 알게 된 점은 docs/plans/reels-run.md 맨 아래 "배운 점"에 적고 커밋 · 푸시
```

## 틱톡 (승인 후)
- 비즈니스 계정 승인 → 프로필에 사이트 링크(`?src=tiktok`)를 넣고, 이후 글은 "프로필 링크에서"로 쓴다.

## 배운 점
- 2026-10-28 1편(엄마) 32초 업로드. 추가 클립3: 세월이 흘러 생일 케이크 옆에서 자녀가 엄마 손을 잡음 / 클립4: 꽃·선물 옆 휴대폰에서 노래가 나오고 엄마 손이 닿음. --audio-start 44.5 그대로(곡 90초라 32초 들어감)
- Flow: 프롬프트 칸 왼쪽 아래 "에이전트" 버튼을 누르면 에이전트 모드가 켜진다 — 칸 가운데를 누를 것. 다운로드 아이콘은 메뉴 없이 360p 원본을 바로 받는다(파일 이름은 Flow가 정함 → reels/out으로 복사)
- 크롬 확장 업로드는 파일당 10MB 한도: final.mp4(32초 약 14MB)를 `ffmpeg -i final.mp4 -c:v libx264 -preset slow -crf 26 -c:a copy -movflags +faststart final_up.mp4`(약 5MB)로 줄여 올린다. 원본이 360p라 화질 차이 없음
- 작업 중 확장 연결이 끊기면 다시 붙을 때 다른 크롬(사주 irurira1000)에 붙을 수 있다 → 다시 붙으면 인스타 계정부터 확인
- 틱톡: 업로드 직후 "자동 콘텐츠 검사를 켤까요?"(계정 설정) 창은 취소. "AI 생성 콘텐츠"는 기본 꺼짐 → "펼치기"에서 켬. 게시 직후 '검토 중'일 때는 첫 댓글이 달리지 않는다(입력은 사라지는데 0개) → 검토가 끝난 뒤 다시 단다
