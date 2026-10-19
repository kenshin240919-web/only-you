"use client";

import { useEffect, useState } from "react";
import { type OrderState, loadOrder, saveOrder } from "@/lib/draft";

/** 로컬에 저장된 주문을 읽고, 바꾸면 다시 저장한다. 첫 렌더에서는 null. */
export function useOrder(): [OrderState | null, (o: OrderState) => void] {
  const [order, setOrder] = useState<OrderState | null>(null);
  useEffect(() => {
    setOrder(loadOrder());
  }, []);
  const update = (o: OrderState) => {
    setOrder(o);
    saveOrder(o);
  };
  return [order, update];
}
