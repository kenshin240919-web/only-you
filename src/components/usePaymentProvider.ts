"use client";

import { useEffect, useState } from "react";

/** 실제 결제(페이앱)인지 모의 결제인지. 페이앱이면 결제마다 휴대폰 번호를 받는다. 확인 전에는 null. */
export function usePaymentProvider(): "payapp" | "mock" | null {
  const [provider, setProvider] = useState<"payapp" | "mock" | null>(null);
  useEffect(() => {
    fetch("/api/payment")
      .then((r) => r.json() as Promise<{ provider: "payapp" | "mock" }>)
      .then((r) => setProvider(r.provider))
      .catch(() => setProvider("mock"));
  }, []);
  return provider;
}
