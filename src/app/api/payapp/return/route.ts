// 페이앱 결제 후 돌아오기. 페이앱이 returnurl을 POST로 열기 때문에 받아서 화면으로 303(GET) 이동한다.
// 결제 확인은 feedback 알림이 하므로 여기서는 이동만 한다. 처음 주문은 주문 상태, 추가 결제는 내 노래로 보낸다.
const back = (req: Request) => {
  const to = new URL(req.url).searchParams.get("to") === "songs" ? "/songs" : "/orders";
  return Response.redirect(new URL(to, req.url), 303);
};

export const GET = back;
export const POST = back;
