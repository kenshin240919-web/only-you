"use client";

import { useEffect, useState } from "react";
import type { PaymentProvider } from "@/lib/payapp";

/** 실제 결제(페이앱)·모의 결제·결제 불가 중 무엇인지. 페이앱이면 결제마다 휴대폰 번호를 받는다. 확인 전에는 null. */
export function usePaymentProvider(): PaymentProvider | null {
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  useEffect(() => {
    fetch("/api/payment")
      .then((r) => r.json() as Promise<{ provider: PaymentProvider }>)
      .then((r) => setProvider(r.provider))
      .catch(() => setProvider("unavailable"));
  }, []);
  return provider;
}
