"use client";

import { useCallback, useEffect, useState } from "react";

type Row = { id: string; name: string; occasion: string; body: string; hasVideo: boolean; rewarded: boolean; published: boolean; createdAt: string };

const EMPTY = { orderNo: "", name: "", occasion: "", body: "", rewarded: true, consent: false };

/** 관리자: 후기 코너(/stories)에 후기 올리기 · 숨기기 · 지우기. 영상은 글을 만든 뒤 따로 올린다. */
export default function AdminReviews() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/reviews");
    if (r.ok) setRows((await r.json()) as Row[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("올리는 중…");
    const r = await fetch("/api/admin/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const d = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!r.ok || !d.id) {
      setMsg(d.message ?? "올리지 못했어요.");
      setBusy(false);
      return;
    }
    if (file) {
      setMsg("영상 올리는 중… (화면을 닫지 마세요)");
      const v = await fetch(`/api/admin/reviews/${d.id}/video`, { method: "PUT", headers: { "content-type": file.type || "video/mp4" }, body: file });
      const vd = (await v.json().catch(() => ({}))) as { message?: string };
      setMsg(v.ok ? "후기를 올렸어요." : `글은 올렸지만 영상은 실패했어요: ${vd.message ?? v.status}`);
    } else setMsg("후기를 올렸어요.");
    setForm(EMPTY);
    setFile(null);
    setBusy(false);
    await load();
  };

  const patch = async (id: string, published: boolean) => {
    await fetch(`/api/admin/reviews/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ published }) });
    await load();
  };
  const remove = async (id: string) => {
    if (!window.confirm("이 후기와 영상을 완전히 지울까요? (게시 중단 요청 등)")) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <section className="card stack" style={{ marginBottom: 16 }} aria-label="후기 코너">
      <strong>후기 코너 올리기</strong>
      <form className="stack" onSubmit={submit}>
        <input className="input" placeholder="주문번호 (선택, 예: OY-...)" value={form.orderNo} onChange={(e) => setForm({ ...form, orderNo: e.target.value })} />
        <input className="input" placeholder="표시 이름 (예: 김○○님)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="상황 (예: 엄마 환갑 선물)" value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} />
        <textarea className="input" rows={3} placeholder="후기 글" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <small className="muted">영상은 95MB까지(mp4 · mov). 카카오톡으로 받은 영상은 보통 이보다 작아요.</small>
        <label className="checkbox" style={{ margin: 0 }}>
          <input type="checkbox" checked={form.rewarded} onChange={(e) => setForm({ ...form, rewarded: e.target.checked })} />
          <span>혜택을 받고 작성된 후기 (화면에 표시)</span>
        </label>
        <label className="checkbox" style={{ margin: 0 }}>
          <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
          <span>보낸 분과 영상에 나온 분 모두의 게시 동의를 확인했어요</span>
        </label>
        <button type="submit" className="btn" disabled={busy || !form.consent}>
          후기 올리기
        </button>
        {msg && <small className="muted">{msg}</small>}
      </form>
      <div>
        {rows.map((r) => (
          <div key={r.id} className="admin-review-row">
            <span>
              {r.published ? "" : "[숨김] "}
              {r.occasion} · {r.name}
              {r.hasVideo ? " · 🎬" : ""}
              <br />
              <small className="muted">{r.body.slice(0, 40)}</small>
            </span>
            <span style={{ whiteSpace: "nowrap" }}>
              <button type="button" className="link-btn" onClick={() => patch(r.id, !r.published)}>
                {r.published ? "숨기기" : "공개"}
              </button>{" "}
              <button type="button" className="link-btn" onClick={() => remove(r.id)}>
                지우기
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
