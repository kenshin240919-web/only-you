"use client";

import { useEffect } from "react";
import { cleanSource, sourceFromReferrer } from "@/lib/source";

const KEY = "oy_src";
const VISITED = "oy_visited";
const KEEP_MS = 30 * 24 * 3600 * 1000;

/** 이 기기의 유입 경로. 30일이 지나면 잊는다. 주문할 때 함께 보낸다. */
export function currentSource(): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { src: string; at: number } | null;
    return saved && Date.now() - saved.at < KEEP_MS ? cleanSource(saved.src) : null;
  } catch {
    return null;
  }
}

/**
 * 들어온 경로를 기억하고 방문을 센다(브라우저 세션당 1번).
 * ?src= 링크는 늘 새 경로로 덮어쓰고, 다른 사이트에서 온 경우는 기억된 경로가 없을 때만 쓴다.
 */
export default function SourceTracker() {
  useEffect(() => {
    try {
      const fromLink = cleanSource(new URLSearchParams(location.search).get("src"));
      const fromReferrer = fromLink ? null : sourceFromReferrer(document.referrer, location.hostname);
      if (fromLink || (fromReferrer && !currentSource())) {
        localStorage.setItem(KEY, JSON.stringify({ src: fromLink ?? fromReferrer, at: Date.now() }));
      }
      if (sessionStorage.getItem(VISITED)) return;
      sessionStorage.setItem(VISITED, "1");
      const src = currentSource() ?? "direct";
      void fetch("/api/visit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ src }), keepalive: true });
    } catch {}
  }, []);
  return null;
}
