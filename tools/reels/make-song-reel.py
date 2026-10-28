#!/usr/bin/env python3
"""온리유송 릴스 만들기: 클립을 이어 붙이고, 위쪽 검은 칸에 2줄 자막을 넣고, 샘플 노래의 한 구간을 깔아 1080x1920 MP4로 만든다.

사주 이루리라의 scripts/reels/make-reel.py와 같은 규격에 노래(음원)만 더했다.

사용법:
  python tools/reels/make-song-reel.py --subs subs.json --font 잘난체2.ttf \
      --audio public/samples/mom.mp3 --audio-start 44.5 --out final.mp4 clip1.mp4 clip2.mp4

subs.json 예:
  [{"start": 0, "end": 4, "top": "엄마와의 추억 한 줄로", "bottom": "노래를 만들었어요"}, ...]

규격:
- 1080x1920, 30fps, 노래는 AAC 192k(영상 길이만큼, 시작 0.3초 · 끝 1.2초 페이드)
- 위 0~600px 검은 칸, 영상은 그 아래 1080x1320에 꽉 채움(넘치면 위아래 잘림)
- 윗줄 흰색 / 아랫줄 금색 #F5C24B, 좌우 6% 여백, 모든 장면 같은 크기, 바뀔 때 0.15초 팝
- 검은 칸 아래쪽 가운데 "Only U song 온리유송 · 예시 사연 · AI로 만든 노래" 회색
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
BAND = 600
FPS = 30
MARGIN = int(W * 0.06)
WHITE = (255, 255, 255)
GOLD = (0xF5, 0xC2, 0x4B)
GRAY = (0xAA, 0xAA, 0xAA)
# 샘플은 가상의 사연이라 "예시 사연"을, AI로 만든 노래라 "AI로 만든 노래"를 늘 표시한다.
BRAND = "Only U song 온리유송 · 예시 사연 · AI로 만든 노래"
BRAND_SIZE = 30
POP = 0.15
EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️‍]")


def run(cmd):
    # Windows 기본 인코딩(cp949)으로는 ffmpeg 출력이 깨지므로 utf-8로 읽는다
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        sys.exit(f"명령 실패: {' '.join(cmd)}\n{r.stderr[-2000:]}")
    return r.stdout


def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).strip())


def clean(text):
    # 글꼴에 이모지가 없으면 □로 깨지므로 이모지는 뺀다
    return EMOJI.sub("", text).strip()


def fit_size(font_path, lines):
    """가장 긴 줄이 좌우 6% 여백 안에 들어가는 가장 큰 크기 (2줄 + 브랜드가 검은 칸 안에 들어가게)."""
    usable_w = W - 2 * MARGIN
    usable_h = BAND - 60 - BRAND_SIZE - 40
    size = 150
    while size > 40:
        f = ImageFont.truetype(font_path, size)
        widest = max(f.getlength(t) for t in lines if t)
        if widest <= usable_w and size * 2.35 <= usable_h:
            return size
        size -= 2
    return size


def band_frame(font, brand_font, size, sub, scale):
    img = Image.new("RGB", (W, BAND), (0, 0, 0))
    d = ImageDraw.Draw(img)
    if sub:
        f = font if scale >= 0.999 else ImageFont.truetype(font.path, max(10, int(size * scale)))
        gap = int(size * 0.35)
        block = size * 2 + gap
        top_y = 60 + (BAND - 60 - BRAND_SIZE - 40 - block) // 2
        for i, (text, color) in enumerate(((sub["top"], WHITE), (sub["bottom"], GOLD))):
            if not text:
                continue
            cy = top_y + i * (size + gap) + size // 2
            d.text((W // 2, cy), text, font=f, fill=color, anchor="mm")
    d.text((W // 2, BAND - 30), BRAND, font=brand_font, fill=GRAY, anchor="ms")
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("clips", nargs="+")
    ap.add_argument("--subs", required=True)
    ap.add_argument("--font", required=True)
    ap.add_argument("--audio", required=True, help="샘플 노래 mp3 (예: public/samples/mom.mp3)")
    ap.add_argument("--audio-start", type=float, default=0.0, help="노래에서 쓸 구간의 시작(초)")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    subs = json.load(open(a.subs, encoding="utf-8"))
    for s in subs:
        s["top"], s["bottom"] = clean(s.get("top", "")), clean(s.get("bottom", ""))
    size = fit_size(a.font, [s["top"] for s in subs] + [s["bottom"] for s in subs])
    font = ImageFont.truetype(a.font, size)
    brand_font = ImageFont.truetype(a.font, BRAND_SIZE)

    tmp = tempfile.mkdtemp()
    try:
        # 1) 클립을 1080x1320에 꽉 채워 이어 붙이고 원래 소리(Flow 효과음)는 버린다
        inputs, chains = [], []
        for i, c in enumerate(a.clips):
            inputs += ["-i", c]
            chains.append(f"[{i}:v]scale={W}:{H - BAND}:force_original_aspect_ratio=increase:flags=lanczos,"
                          f"crop={W}:{H - BAND},setsar=1,fps={FPS}[v{i}]")
        concat = "".join(f"[v{i}]" for i in range(len(a.clips))) + f"concat=n={len(a.clips)}:v=1:a=0[v]"
        body = os.path.join(tmp, "body.mp4")
        run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(chains + [concat]), "-map", "[v]",
             "-an", "-c:v", "libx264", "-crf", "16", "-preset", "medium", body])
        total = duration(body)

        # 2) 검은 칸 프레임 (팝: 0.15초 동안 85% → 100%)
        frames = os.path.join(tmp, "band")
        os.makedirs(frames)
        n = int(round(total * FPS))
        for k in range(n):
            t = k / FPS
            sub = next((s for s in subs if s["start"] <= t < s["end"]), None)
            scale = 1.0
            if sub and t - sub["start"] < POP:
                p = (t - sub["start"]) / POP
                scale = 0.85 + 0.15 * (1 - (1 - p) ** 2)
            band_frame(font, brand_font, size, sub, scale).save(os.path.join(frames, f"{k:05d}.png"))

        # 3) 검은 칸 + 영상 세로로 붙이고 노래 구간을 깐다
        fade_out = max(0.0, total - 1.2)
        run(["ffmpeg", "-y", "-framerate", str(FPS), "-i", os.path.join(frames, "%05d.png"), "-i", body,
             "-ss", f"{a.audio_start}", "-t", f"{total}", "-i", a.audio,
             "-filter_complex",
             f"[0:v][1:v]vstack=inputs=2,format=yuv420p[v];[2:a]afade=t=in:d=0.3,afade=t=out:st={fade_out}:d=1.2[a]",
             "-map", "[v]", "-map", "[a]", "-r", str(FPS), "-c:v", "libx264", "-crf", "18", "-preset", "medium",
             "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", a.out])
        print(f"완성: {a.out} ({total:.1f}초, 자막 글씨 {size}px, 노래 {a.audio_start}초부터)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
