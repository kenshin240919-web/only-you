// ElevenLabs 한국어 품질 시험: 3개 상황 × 보컬 2종 × 이름/호칭 2종 = 12곡.
// 기본은 비용이 들지 않는 "계획만 보기"이며, --run을 붙여야 실제로 생성(과금)한다.
//
//   node tools/music-test/run.mjs                 # 시험 목록과 예상 사용량만 출력
//   node tools/music-test/run.mjs --run           # 12곡 생성
//   node tools/music-test/run.mjs --run --only=parents-female-nickname
//   node tools/music-test/run.mjs --run --free      # 무료 3분용: 부모님·여성 보컬, 이름/호칭 2곡 × 1분 30초 (1절+후렴)
//
// 환경 변수 ELEVENLABS_API_KEY가 필요하다. 결과는 tools/music-test/out/에 저장된다.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? true]));
const MODEL = args.model ?? "music_v2_5";
const PRICE_PER_MIN_USD = 0.15; // 2026-10-19 elevenlabs.io/pricing/api 기준, 포함 분량 초과 시
const outDir = join(here, "out");
const FREE_PRESET = ["parents-female-nickname", "parents-female-name"];

const cfg = JSON.parse(await readFile(join(here, "cases.json"), "utf8"));
// --free: 무료 플랜 포함 분량(3분)에 맞춰 앞의 두 구간만 1분 30초로 만든다.
if (args.free) {
  cfg.lengthMs = 90000;
  for (const s of Object.values(cfg.scenarios)) s.sections = s.sections.slice(0, 2);
}

function buildCases() {
  const cases = [];
  for (const [scenario, s] of Object.entries(cfg.scenarios)) {
    for (const [vocal, vocalStyle] of Object.entries(cfg.vocals)) {
      for (const [mode, call] of Object.entries(cfg.callNames[scenario])) {
        const per = Math.floor(cfg.lengthMs / s.sections.length);
        const chunks = s.sections.map(([label, lines], i) => ({
          text: `[${label}]\n` + lines.map((l) => l.replaceAll("{CALL}", call)).join("\n"),
          duration_ms: per,
          positive_styles: i === 0 ? [...s.styles, vocalStyle] : [vocalStyle, s.styles[0]],
          negative_styles: [],
        }));
        cases.push({ id: `${scenario}-${vocal}-${mode}`, scenario, vocal, mode, call, title: s.title, chunks });
      }
    }
  }
  return cases;
}

const all = buildCases();
const only = args.free ? FREE_PRESET : args.only ? String(args.only).split(",") : null;
const cases = only ? all.filter((c) => only.includes(c.id)) : all;
const minutes = (cases.length * cfg.lengthMs) / 60000;

console.log(`모델: ${MODEL} · 시험 ${cases.length}곡 · 곡당 ${cfg.lengthMs / 1000}초 · 총 ${minutes}분`);
console.log(`포함 분량을 넘으면 예상 비용: 약 $${(minutes * PRICE_PER_MIN_USD).toFixed(2)}`);
for (const c of cases) console.log(` - ${c.id} (호칭: ${c.call})`);

if (!args.run) {
  console.log("\n실제 생성하려면 --run을 붙이세요. (과금 발생)");
  process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY 환경 변수가 없습니다.");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const results = [];
for (const c of cases) {
  const mp3 = join(outDir, `${c.id}-${cfg.lengthMs / 1000}s.mp3`);
  if (await access(mp3).then(() => true, () => false)) {
    // 이미 만든 곡은 다시 과금하지 않는다.
    console.log(`건너뜀(이미 있음): ${c.id}`);
    continue;
  }
  const started = Date.now();
  process.stdout.write(`생성 중: ${c.id} ... `);
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ model_id: MODEL, composition_plan: { chunks: c.chunks } }),
    });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    if (!res.ok) {
      const detail = await res.text();
      console.log(`실패 ${res.status} (${seconds}s)`);
      console.log(`  ${detail}`);
      results.push({ id: c.id, ok: false, status: res.status, detail, seconds });
      await writeFile(join(outDir, `results-${MODEL}.json`), JSON.stringify(results, null, 2));
      // 시간 초과·서버 오류 뒤 자동 재시도는 중복 과금 위험이 있어 하지 않는다.
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(mp3, buf);
    const songId = res.headers.get("song-id") ?? res.headers.get("x-song-id");
    console.log(`완료 ${seconds}s, ${(buf.length / 1024).toFixed(0)}KB`);
    results.push({ id: c.id, ok: true, seconds, bytes: buf.length, songId, call: c.call, text: c.chunks.map((ch) => ch.text) });
  } catch (e) {
    console.log(`오류: ${e.message} — 결과 불명. 과금 여부를 대시보드에서 확인하세요.`);
    results.push({ id: c.id, ok: false, error: String(e) });
  }
  await writeFile(join(outDir, `results-${MODEL}.json`), JSON.stringify(results, null, 2));
}
console.log(`\n결과: ${join(outDir, `results-${MODEL}.json`)}`);
