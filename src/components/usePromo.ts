"use client";

import { useEffect, useState } from "react";

/** 오픈 기념 무료 진행 여부와 남은 자리. 확인 전이나 끝났으면 null. */
export function usePromo(): { left: number; limit: number } | null {
  const [promo, setPromo] = useState<{ left: number; limit: number } | null>(null);
  useEffect(() => {
    fetch("/api/promo")
      .then((r) => r.json() as Promise<{ active: boolean; left: number; limit: number }>)
      .then((d) => setPromo(d.active ? { left: d.left, limit: d.limit } : null))
      .catch(() => setPromo(null));
  }, []);
  return promo;
}
