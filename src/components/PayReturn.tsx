"use client";

import { useEffect } from "react";

/**
 * 페이앱 결제가 끝나면 결제창(새 창)이 ?from=pay 주소로 돌아온다.
 * 사이트 창이 열려 있으면 그 창을 새로 고쳐(결제 상태 다시 확인) 앞으로 보내고 결제창은 닫는다.
 * 사이트 창이 없으면(같은 창에서 결제한 경우) 이 창에서 그대로 보여 주고 주소의 표시만 지운다.
 */
export default function PayReturn() {
  useEffect(() => {
    const url = new URL(location.href);
    if (url.searchParams.get("from") !== "pay") return;
    try {
      if (window.opener && window.opener.location.origin === location.origin) {
        window.opener.location.reload();
        window.opener.focus();
        window.close();
        return;
      }
    } catch {}
    url.searchParams.delete("from");
    history.replaceState(null, "", url.pathname + url.search);
  }, []);
  return null;
}
