// 가사 작성 방식 비교: 같은 사연으로 A(ElevenLabs가 가사 작성) vs B(미리 쓴 가사). 과금되며 재시도하지 않는다.
//   node tools/music-test/compare-lyrics.mjs   # 결과: tools/music-test/out/compare/
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const out = join(dirname(fileURLToPath(import.meta.url)), "out", "compare");
await mkdir(out, { recursive: true });
const key = process.env.ELEVENLABS_API_KEY;
const styles = ["Korean acoustic ballad", "emotional piano", "acoustic guitar", "warm strings", "slow tempo around 70 bpm", "heartfelt", "warm female vocal", "Korean lyrics"];

const promptA = `A heartfelt Korean acoustic ballad sung by a warm female vocal: a daughter's gift for her father's 60th birthday. All lyrics must be in natural Korean and address him as "아빠". Include these memories: when she learned to ride a bicycle he held the back of the seat, said he hadn't let go, and she later saw him standing far behind her; on a day of sudden rain he waited at the school gate with a blue umbrella, his own shoulders soaked. End with the message "이제는 제가 아빠의 우산이 되어 드릴게요". Structure: verse, chorus, verse, chorus, outro. Slow tempo around 70 bpm, piano, acoustic guitar, warm strings.`;

const sec = (label, lines) => `[${label}]\n` + lines.join("\n");
const chorus = ["고마워요 아빠", "늘 한 걸음 뒤에 있던 사람", "이제야 알 것 같아요", "그 손이 날 지켜 왔다는 걸"];
const lyricsB = [
  sec("1절", ["비틀대던 내 자전거 뒤에서", "놓지 않았다고 웃던 아빠", "뒤돌아보면 저 멀리 서 있던", "그 미소가 날 달리게 했죠"]),
  sec("후렴", chorus),
  sec("2절", ["갑자기 비가 쏟아지던 날", "교문 앞에 파란 우산 하나", "젖은 어깨로 손 흔들던 아빠", "그날의 우산 아직 기억해요"]),
  sec("후렴", chorus),
  sec("마무리", ["예순 번째 봄을 축하해요", "이제는 제가 아빠의 우산이 되어 드릴게요"]),
];
const planB = { chunks: lyricsB.map((text, i) => ({ text, duration_ms: 30000, positive_styles: i === 0 ? styles : ["warm female vocal", "Korean acoustic ballad"], negative_styles: [] })) };

async function run(id, body) {
  const t = Date.now();
  const res = await fetch("https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_44100_128", {
    method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ model_id: "music_v2_5", ...body }),
  });
  const sec = ((Date.now() - t) / 1000).toFixed(1);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") ?? "";
  console.log(`${id}: HTTP ${res.status} ${sec}s ${ct} ${buf.length}B`);
  await writeFile(join(out, `${id}.raw`), buf);
  if (!res.ok) { console.log(buf.toString().slice(0, 800)); return; }
  const boundary = /boundary="?([^";]+)"?/.exec(ct)?.[1];
  if (!boundary) { await writeFile(join(out, `${id}.mp3`), buf); return; }
  const parts = []; const b = Buffer.from(`--${boundary}`); let i = buf.indexOf(b);
  while (i !== -1) { const j = buf.indexOf(b, i + b.length); if (j === -1) break; parts.push(buf.subarray(i + b.length, j)); i = j; }
  for (const p of parts) {
    const h = p.indexOf("\r\n\r\n"); const head = p.subarray(0, h).toString(); let body = p.subarray(h + 4);
    if (body.subarray(-2).toString() === "\r\n") body = body.subarray(0, -2);
    if (/json/i.test(head)) await writeFile(join(out, `${id}.json`), body);
    else if (/audio|octet/i.test(head)) await writeFile(join(out, `${id}.mp3`), body);
    console.log("  part:", head.replace(/\r\n/g, " | "), body.length);
  }
}
await run("A-elevenlabs-lyrics", { prompt: promptA, music_length_ms: 150000 });
await run("B-claude-lyrics", { composition_plan: planB });
