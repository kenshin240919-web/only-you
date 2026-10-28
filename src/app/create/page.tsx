"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trackStep } from "@/components/trackStep";
import {
  type Draft,
  type OrderState,
  callName,
  emptyOrder,
  genreLabel,
  loadOrder,
  reasonLabel,
  relationshipLabel,
  saveOrder,
} from "@/lib/draft";
import { GENRES, NICKNAMES, REASONS, RELATIONSHIPS, VOCALS, labelOf } from "@/lib/options";

const TOTAL = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = {
  name: 30,
  nickname: 20,
  pronunciation: 40,
  traits: { min: 10, max: 300 },
  memory: { min: 20, max: 700 },
  message: 200,
  exclude: 150,
};

function stepValid(step: number, d: Draft): boolean {
  switch (step) {
    case 1:
      return !!d.relationship && (d.relationship !== "other" || d.customRelationship.trim().length > 0);
    case 2:
      return d.name.trim().length > 0 || d.nickname.trim().length > 0;
    case 3:
      return !!d.reason && (d.reason !== "custom" || d.customReason.trim().length > 0);
    case 4:
      return !!d.genre && !!d.vocal;
    case 5:
      return d.traits.trim().length >= LIMITS.traits.min;
    case 6:
      return d.memory.trim().length >= LIMITS.memory.min;
    case 7:
      return true;
    case 8:
      return EMAIL_RE.test(d.email.trim()) && d.agreeRequired;
    default:
      return false;
  }
}

export default function CreatePage() {
  const router = useRouter();
  const [order, setOrder] = useState<OrderState>(emptyOrder);
  const [step, setStep] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const saved = loadOrder();
    // 메인의 "엄마에게" 같은 버튼에서 들어오면 1단계를 미리 채운다.
    const preset = new URLSearchParams(window.location.search).get("for");
    if (preset && RELATIONSHIPS.some((r) => r.value === preset) && !saved.draft.relationship) {
      saved.draft.relationship = preset;
    }
    setOrder(saved);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveOrder(order);
  }, [order, loaded]);

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
    // 1단계를 넘기면 "만들기 시작"으로 센다(페이지만 열어 본 사람은 빼고).
    if (step >= 2) trackStep("create");
  }, [step]);

  const d = order.draft;
  const update = (patch: Partial<Draft>) =>
    setOrder((o) => ({ ...o, draft: { ...o.draft, ...patch } }));

  const next = () => {
    if (!stepValid(step, d)) return;
    if (step < TOTAL) {
      setStep(step + 1);
      return;
    }
    saveOrder(order);
    router.push("/checkout");
  };
  const prev = () => (step > 1 ? setStep(step - 1) : router.push("/"));

  const nicknameOptions = NICKNAMES[d.relationship] ?? [];
  const pct = Math.round((step / TOTAL) * 100);

  return (
    <div className="container narrow wizard">
      <div className="progress-wrap">
        <div className="progress-label">
          <span>
            {step} / {TOTAL} 단계
          </span>
          <span>{pct}%</span>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        {step === 1 && (
          <section>
            <h1 className="step-title" tabIndex={-1} ref={headingRef}>
              누구에게 노래를 선물하나요?
            </h1>
            <p className="step-help">받는 분과의 관계를 골라 주세요.</p>
            <div className="choices" role="group" aria-label="받는 사람">
              {RELATIONSHIPS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className="choice"
                  aria-pressed={d.relationship === r.value}
                  onClick={() => update({ relationship: r.value, nickname: "" })}
                >
                  <span aria-hidden>{r.emoji}</span>
                  {r.label}
                </button>
              ))}
            </div>
            {d.relationship === "other" && (
              <label className="field" style={{ marginTop: 16 }}>
                <span className="field-label">
                  어떤 관계인가요?<span className="req">필수</span>
                </span>
                <input
                  className="input"
                  value={d.customRelationship}
                  maxLength={20}
                  placeholder="예: 선생님, 이모, 동생"
                  onChange={(e) => update({ customRelationship: e.target.value })}
                />
              </label>
            )}
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="step-title" tabIndex={-1} ref={headingRef}>
              {relationshipLabel(d)}의 이름을 알려 주세요
            </h1>
            <p className="step-help">이름 그대로 적어 주세요. 노래에서 부를 호칭은 따로 고를 수 있어요.</p>
            <label className="field">
              <span className="field-label">이름</span>
              <input
                className="input"
                value={d.name}
                maxLength={LIMITS.name}
                placeholder="예: 김순자"
                autoComplete="off"
                onChange={(e) => update({ name: e.target.value })}
              />
            </label>

            {(d.name.trim() || nicknameOptions.length > 0) && (
              <div className="field">
                <span className="field-label">노래에서는 어떻게 부를까요? (선택)</span>
                <div className="choices" role="group" aria-label="호칭">
                  {d.name.trim() && (
                    <button
                      type="button"
                      className="choice"
                      aria-pressed={!d.nickname}
                      onClick={() => update({ nickname: "" })}
                    >
                      이름으로 ({d.name.trim()})
                    </button>
                  )}
                  {nicknameOptions.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="choice"
                      aria-pressed={d.nickname === n}
                      onClick={() => update({ nickname: n })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  className="input"
                  style={{ marginTop: 10 }}
                  value={nicknameOptions.includes(d.nickname) ? "" : d.nickname}
                  maxLength={LIMITS.nickname}
                  placeholder="직접 입력 (예: 우리 공주, 순자 씨)"
                  aria-label="호칭 직접 입력"
                  onChange={(e) => update({ nickname: e.target.value })}
                />
                {(d.name.trim() || d.nickname) && (
                  <div className="preview-line" aria-live="polite">
                    ♪ 노래에서는 “{callName(d)}”(이)라고 불러요
                  </div>
                )}
              </div>
            )}

            <label className="field">
              <span className="field-label">발음 메모 (선택)</span>
              <input
                className="input"
                value={d.pronunciation}
                maxLength={LIMITS.pronunciation}
                placeholder="헷갈리는 이름이면 소리 나는 대로 적어 주세요 (예: 이률 → 이뉼)"
                onChange={(e) => update({ pronunciation: e.target.value })}
              />
            </label>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="step-title" tabIndex={-1} ref={headingRef}>
              어떤 마음을 전하고 싶나요?
            </h1>
            <p className="step-help">노래의 중심이 될 마음이에요. 특별한 날이 아니어도 괜찮아요.</p>
            <div className="choices" role="group" aria-label="전하는 마음">
              {[...REASONS, { value: "custom", label: "직접 입력" }].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className="choice"
                  aria-pressed={d.reason === r.value}
                  onClick={() => update({ reason: r.value })}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {d.reason === "custom" && (
              <label className="field" style={{ marginTop: 16 }}>
                <span className="field-label">
                  어떤 마음인가요?<span className="req">필수</span>
                </span>
                <input
                  className="input"
                  value={d.customReason}
                  maxLength={30}
                  placeholder="예: 첫 출근을 축하해서"
                  onChange={(e) => update({ customReason: e.target.value })}
                />
              </label>
            )}
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 className="step-title" tabIndex={-1} ref={headingRef}>
              어떤 분위기의 노래가 좋을까요?
            </h1>
            <p className="step-help">장르 하나와 보컬을 골라 주세요.</p>
            <span className="field-label">장르</span>
            <div className="choices wide" role="group" aria-label="장르">
              {GENRES.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  className="choice"
                  aria-pressed={d.genre === g.value}
                  onClick={() => update({ genre: g.value })}
                >
                  {g.label}
                  <small>{g.desc}</small>
                </button>
              ))}
            </div>
            <span className="field-label" style={{ marginTop: 24 }}>
              보컬
            </span>
            <div className="choices" role="group" aria-label="보컬">
              {VOCALS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  className="choice"
                  aria-pressed={d.vocal === v.value}
                  onClick={() => update({ vocal: v.value })}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
              보컬은 AI가 만드는 목소리의 분위기입니다. 특정 가수의 목소리를 흉내 내지 않아요.
            </p>
          </section>
        )}

        {step === 5 && (
          <section>
            <h1 className="step-title" tabIndex={-1} ref={headingRef}>
              {callName(d)}은(는) 어떤 사람인가요?
            </h1>
            <p className="step-help">성격, 습관, 고마운 점을 1~3문장으로 적어 주세요.</p>
            <div className="tip">예: 항상 남을 먼저 챙기는 사람. 힘들어도 웃으면서 괜찮다고 말해요.</div>
            <TextArea
              label="어떤 사람인지"
              value={d.traits}
              min={LIMITS.traits.min}
              max={LIMITS.traits.max}
              onChange={(v) => update({ traits: v })}
            />
          </section>
        )}

        {step === 6 && (
          <section>
            <h1 className="step-title" tabIndex={-1} ref={headingRef}>
              노래에 꼭 담고 싶은 추억이 있나요?
            </h1>
            <p className="step-help">언제, 어디서, 무엇을 했는지 구체적으로 쓸수록 노래가 특별해져요.</p>
            <div className="tip">예: 첫 손녀 영희가 집에 오던 날, 엄마가 현관에서 한참을 안고 울었어요.</div>
            <TextArea
              label="추억"
              value={d.memory}
              min={LIMITS.memory.min}
              max={LIMITS.memory.max}
              onChange={(v) => update({ memory: v })}
            />
            <p className="muted" style={{ fontSize: 13 }}>
              주민번호·건강 정보 같은 민감한 정보는 적지 말아 주세요.
            </p>
          </section>
        )}

        {step === 7 && (
          <section>
            <h1 className="step-title" tabIndex={-1} ref={headingRef}>
              마지막으로 전하고 싶은 말이 있나요?
            </h1>
            <p className="step-help">비워 둬도 괜찮아요.</p>
            <TextArea
              label="전하고 싶은 말 (선택)"
              value={d.message}
              max={LIMITS.message}
              placeholder="예: 항상 고맙고 사랑해요."
              onChange={(v) => update({ message: v })}
            />
            <TextArea
              label="가사에서 빼고 싶은 내용 (선택)"
              value={d.exclude}
              max={LIMITS.exclude}
              placeholder="예: 돌아가신 할아버지 이야기는 넣지 말아 주세요."
              onChange={(v) => update({ exclude: v })}
            />
          </section>
        )}

        {step === 8 && (
          <section>
            <h1 className="step-title" tabIndex={-1} ref={headingRef}>
              입력한 내용을 확인해 주세요
            </h1>
            <p className="step-help">결제하면 이 이야기로 AI가 가사와 노래를 함께 만들어요.</p>
            <ul className="summary-list card" style={{ padding: "4px 20px", marginBottom: 24 }}>
              <SummaryRow k="받는 분" v={relationshipLabel(d)} onEdit={() => setStep(1)} />
              <SummaryRow
                k="이름·호칭"
                v={`${d.name || "-"}${d.nickname ? ` (노래에서 “${d.nickname}”)` : ""}`}
                onEdit={() => setStep(2)}
              />
              <SummaryRow k="마음" v={reasonLabel(d)} onEdit={() => setStep(3)} />
              <SummaryRow
                k="장르·보컬"
                v={`${genreLabel(d)} · ${labelOf(VOCALS, d.vocal)}`}
                onEdit={() => setStep(4)}
              />
              <SummaryRow k="어떤 사람" v={d.traits} onEdit={() => setStep(5)} />
              <SummaryRow k="추억" v={d.memory} onEdit={() => setStep(6)} />
              <SummaryRow k="전하는 말" v={d.message || "없음"} onEdit={() => setStep(7)} />
              <SummaryRow k="빼고 싶은 내용" v={d.exclude || "없음"} onEdit={() => setStep(7)} />
              {d.pronunciation.trim() && <SummaryRow k="발음 메모" v={d.pronunciation} onEdit={() => setStep(2)} />}
            </ul>

            <label className="field">
              <span className="field-label">
                이메일<span className="req">필수</span>
              </span>
              <input
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={d.email}
                placeholder="주문 관련 안내를 받을 이메일"
                onChange={(e) => update({ email: e.target.value })}
              />
              {d.email && !EMAIL_RE.test(d.email.trim()) && (
                <span className="field-meta field-error">이메일 형식을 확인해 주세요.</span>
              )}
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={d.agreeRequired}
                onChange={(e) => update({ agreeRequired: e.target.checked })}
              />
              <span>
                <strong>(필수)</strong> 노래 제작을 위해 입력한 이야기를 AI로 처리하는 데 동의합니다.
              </span>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={d.agreeMarketing}
                onChange={(e) => update({ agreeMarketing: e.target.checked })}
              />
              <span>(선택) 할인·이벤트 소식을 이메일로 받겠습니다.</span>
            </label>
            <p className="notice">입력 내용은 결제 전까지 이 기기에만 7일간 저장되고, 결제하면 노래 제작을 위해 서버에 저장돼요.</p>
          </section>
        )}

        <div className="wizard-nav">
          <div className="container narrow">
            <button type="button" className="btn-ghost" onClick={prev}>
              이전
            </button>
            <button type="submit" className="btn" disabled={!stepValid(step, d)}>
              {step === TOTAL ? "주문 확인하기" : "다음"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function TextArea({
  label,
  value,
  min,
  max,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  min?: number;
  max: number;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const len = value.trim().length;
  const short = min !== undefined && len > 0 && len < min;
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {min !== undefined && <span className="req">필수</span>}
      </span>
      <textarea
        className="textarea"
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="field-meta">
        <span className={short ? "field-error" : undefined}>
          {min !== undefined ? (short ? `${min}자 이상 적어 주세요` : `최소 ${min}자`) : ""}
        </span>
        <span>
          {value.length} / {max}
        </span>
      </span>
    </label>
  );
}

function SummaryRow({ k, v, onEdit }: { k: string; v: string; onEdit: () => void }) {
  return (
    <li>
      <span className="summary-key">{k}</span>
      <span className="summary-val">{v}</span>
      <button type="button" className="link-btn" onClick={onEdit} aria-label={`${k} 수정`}>
        수정
      </button>
    </li>
  );
}
