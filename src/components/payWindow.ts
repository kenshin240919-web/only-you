"use client";

// 페이앱 결제창은 새 창으로 연다. 결제창을 닫아도 사이트 창이 남아 있고, 사이트 창이 결제 상태를 계속 확인한다.
// 팝업 차단을 피하려면 버튼을 누른 순간(서버 요청 전에) 빈 창을 먼저 열어 두고, 주소가 나오면 그 창으로 보낸다.

/** 버튼을 누른 순간 호출한다. 막히면 null(그때는 지금 창에서 결제창을 연다). */
export function openPayWindow(): Window | null {
  try {
    const win = window.open("", "oy_pay");
    win?.document.write('<p style="font-family:sans-serif;text-align:center;margin-top:40vh">결제창을 여는 중…</p>');
    return win;
  } catch {
    return null;
  }
}

/** 결제창 주소로 보낸다. 새 창이 있으면 그 창, 없으면 지금 창. 새 창으로 열었으면 true. */
export function goPay(win: Window | null, payurl: string): boolean {
  if (win && !win.closed) {
    win.location.href = payurl;
    return true;
  }
  window.location.href = payurl;
  return false;
}

/** 결제 요청이 실패했거나 결제가 필요 없을 때 미리 연 빈 창을 닫는다. */
export function closePayWindow(win: Window | null) {
  if (win && !win.closed) win.close();
}
