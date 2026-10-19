// 페이앱 결제 후 돌아오기. 페이앱이 returnurl을 POST로 열기 때문에 받아서 주문 상태 화면으로 303(GET) 이동한다.
// 결제 확인은 feedback 알림이 하므로 여기서는 이동만 한다.
const back = (req: Request) => Response.redirect(new URL("/orders", req.url), 303);

export const GET = back;
export const POST = back;
