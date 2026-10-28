"use client";

/** 단계 도착을 브라우저 세션당 1번만 센다(관리자 화면 "단계별 숫자"). 실패해도 화면에는 영향이 없다. */
export function trackStep(step: "create" | "checkout") {
  try {
    const key = `oy_step_${step}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch("/api/funnel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ step }), keepalive: true });
  } catch {}
}
