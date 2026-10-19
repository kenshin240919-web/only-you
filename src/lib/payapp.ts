import "server-only";

// 페이앱 건별 결제. saju.guidejung.com과 같은 판매자 계정·방식(결제 요청 → 결제창 → feedbackurl 알림)을 쓴다.
// 금액은 서버가 정하고, 결제 완료는 페이앱 알림(/api/payapp/feedback)에서 연동값·결제요청번호·금액이 모두 맞을 때만 인정한다.

export function payappEnabled(env: CloudflareEnv): boolean {
  return (env.PAYMENT_MODE as string) === "payapp" && Boolean(env.PAYAPP_USERID && env.PAYAPP_LINKKEY && env.PAYAPP_LINKVAL);
}

export type PayRequest = { purchaseId: string; amount: number; goodname: string; phone: string; origin: string; back: "orders" | "songs" };

export async function requestPayment(env: CloudflareEnv, p: PayRequest): Promise<{ payurl: string; mulNo: string } | null> {
  const res = await fetch("https://api.payapp.kr/oapi/apiLoad.html", {
    method: "POST",
    body: new URLSearchParams({
      cmd: "payrequest",
      userid: env.PAYAPP_USERID,
      goodname: p.goodname,
      price: String(p.amount),
      // 구매자 휴대폰 번호는 페이앱 필수값이라 전달만 하고 DB에는 저장하지 않는다(문자 발송 안 함).
      recvphone: p.phone,
      smsuse: "n",
      feedbackurl: `${p.origin}/api/payapp/feedback`,
      var1: p.purchaseId,
      // 페이앱은 returnurl을 POST로 열어서, 받아서 주문 상태 화면으로 GET 이동시키는 라우트를 둔다.
      returnurl: `${p.origin}/api/payapp/return?to=${p.back}`,
      redirectpay: "1",
      skip_cstpage: "y",
      checkretry: "y",
    }),
  });
  const r = new URLSearchParams(await res.text());
  const payurl = r.get("payurl");
  const mulNo = r.get("mul_no");
  if (r.get("state") !== "1" || !payurl || !mulNo) {
    console.error("payapp payrequest", r.get("errorMessage"));
    return null;
  }
  return { payurl, mulNo };
}

/** 알림이 우리 판매자 계정에서 온 것인지 연동값으로 확인한다. */
export function verifyFeedback(env: CloudflareEnv, f: URLSearchParams): boolean {
  return (
    Boolean(env.PAYAPP_LINKVAL) &&
    f.get("userid") === env.PAYAPP_USERID &&
    f.get("linkkey") === env.PAYAPP_LINKKEY &&
    f.get("linkval") === env.PAYAPP_LINKVAL
  );
}

export const PAID_STATE = "4";
export const CANCEL_STATES = ["8", "9", "32", "64"];
