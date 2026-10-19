"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LyricsSheet from "@/components/LyricsSheet";
import {
  MAX_REWRITES,
  type OrderState,
  callName,
  generateLyrics,
  genreLabel,
  loadOrder,
  lyricsToText,
  saveOrder,
  textToLyrics,
} from "@/lib/draft";
import { VOCALS, labelOf } from "@/lib/options";

export default function DraftPage() {
  const router = useRouter();
  const [order, setOrder] = useState<OrderState | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    setOrder(loadOrder());
  }, []);

  if (!order) return null;

  if (!order.lyrics) {
    return (
      <div className="container narrow page-head">
        <h1>아직 만든 가사가 없어요</h1>
        <p>먼저 이야기를 입력해 주세요.</p>
        <p style={{ marginTop: 20 }}>
          <Link href="/create" className="btn">
            이야기 쓰러 가기
          </Link>
        </p>
      </div>
    );
  }

  const d = order.draft;
  const lyrics = order.lyrics;
  const rewritesLeft = MAX_REWRITES - order.rewrites;

  const commit = (o: OrderState) => {
    setOrder(o);
    saveOrder(o);
  };

  const rewrite = () => {
    if (rewritesLeft <= 0) return;
    commit({ ...order, lyrics: generateLyrics(d, order.rewrites + 1), rewrites: order.rewrites + 1 });
  };

  const startEdit = () => {
    setTitle(lyrics.title);
    setText(lyricsToText(lyrics));
    setEditing(true);
  };

  const saveEdit = () => {
    commit({ ...order, lyrics: textToLyrics(title.trim() || lyrics.title, text) });
    setEditing(false);
  };

  const confirm = () => {
    commit({ ...order, confirmedAt: new Date().toISOString() });
    router.push("/checkout");
  };

  // 고객이 입력한 이름·호칭이 실제 가사에 들어갔는지 표시해 확인을 돕는다.
  const highlights = [callName(d), d.name.trim()].filter(Boolean);
  const allText = lyricsToText(lyrics);
  const nameIncluded = highlights.some((h) => allText.includes(h));

  return (
    <div className="container narrow" style={{ paddingBottom: 40 }}>
      <div className="page-head">
        <span className="eyebrow">무료 가사 미리보기</span>
        <h1 style={{ marginTop: 12 }}>가사를 먼저 확인해 주세요</h1>
        <p>마음에 들 때만 결제하세요. 직접 고치거나 AI에게 다시 쓰게 할 수 있어요.</p>
      </div>

      <div className="notice">
        시제품의 가사는 정해진 틀로 만든 예시입니다. 실제 서비스에서는 AI가 입력한 이야기로 새로 씁니다.
      </div>

      {editing ? (
        <div className="card stack">
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">제목</span>
            <input className="input" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field" style={{ margin: 0 }}>
            <span className="field-label">가사</span>
            <textarea
              className="textarea"
              style={{ minHeight: 360, fontFamily: "var(--serif)" }}
              value={text}
              maxLength={1500}
              onChange={(e) => setText(e.target.value)}
            />
            <span className="field-meta">
              <span>[1절], [후렴]처럼 대괄호로 구간을 나눠요</span>
              <span>{text.length} / 1500</span>
            </span>
          </label>
          <div className="actions-row" style={{ margin: 0 }}>
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
              취소
            </button>
            <button type="button" className="btn" onClick={saveEdit}>
              수정 저장
            </button>
          </div>
        </div>
      ) : (
        <>
          <LyricsSheet
            lyrics={lyrics}
            meta={`${genreLabel(d)} · ${labelOf(VOCALS, d.vocal)}`}
            highlights={highlights}
          />
          <ul className="check-list">
            <li style={nameIncluded ? undefined : { color: "var(--accent-dark)" }}>
              {nameIncluded ? `“${callName(d)}”(이)라는 호칭이 들어갔어요` : "이름·호칭이 빠졌어요. 직접 수정해 주세요"}
            </li>
            <li>추억이 2절에 담겼는지 확인해 주세요</li>
          </ul>
          <div className="actions-row">
            <button type="button" className="btn-ghost" onClick={startEdit}>
              ✎ 직접 수정
            </button>
            <button type="button" className="btn-ghost" onClick={rewrite} disabled={rewritesLeft <= 0}>
              ↻ 다시 쓰기 ({rewritesLeft}회 남음)
            </button>
            <Link href="/create" className="btn-ghost">
              이야기 고치기
            </Link>
          </div>
          <div className="card" style={{ marginTop: 8 }}>
            <p style={{ margin: "0 0 12px" }}>
              이 가사로 노래를 만들까요? 결제 후에는 확정한 가사로 제작되며, 노래를 부르는 과정에서 발음이 조금 달라질 수
              있어요.
            </p>
            <button type="button" className="btn btn-block" onClick={confirm}>
              이 가사로 노래 만들기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
