"use client";

export const isPhone = (v: string) => /^01\d{8,9}$/.test(v.replace(/\D/g, ""));

/** 페이앱 결제에 필요한 휴대폰 번호 입력. 결제 확인에만 쓰고 저장하지 않는다. */
export default function PhoneField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="field" style={{ margin: 0 }}>
      <span className="field-label">
        휴대폰 번호<span className="req">필수</span>
      </span>
      <input
        id={id}
        className="input"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={value}
        placeholder="01012345678"
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="field-meta">결제대행사(페이앱)의 결제 확인에만 쓰고 저장하지 않아요.</span>
    </label>
  );
}
