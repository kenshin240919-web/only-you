import "server-only";
import { BUSINESS } from "./business";
import { getDb } from "./db";

// 거래 알림 메일. Cloudflare Email Service(Workers 유료 플랜에 월 3,000통 포함)로 보낸다.
// EMAIL 바인딩과 MAIL_FROM이 모두 있어야 보내고, 없으면 조용히 건너뛴다. 메일 실패가 주문 처리를 막지 않는다.

type Mail = { to: string; subject: string; text: string; html: string };

// 받는 사람 메일 앱에 "Only U song"으로 보이게 한다.
const sender = (env: CloudflareEnv) => ({ email: env.MAIL_FROM as string, name: "Only U song" });

export function mailEnabled(env: CloudflareEnv): boolean {
  return Boolean(env.EMAIL && env.MAIL_FROM);
}

async function send(env: CloudflareEnv, m: Mail): Promise<void> {
  if (!env.EMAIL || !env.MAIL_FROM) return;
  try {
    await env.EMAIL.send({ from: sender(env), to: m.to, subject: m.subject, text: m.text, html: m.html, replyTo: BUSINESS.email });
  } catch (e) {
    console.error("mail send failed", m.subject, e);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// 메일 본문 공통 틀. 메일 앱마다 지원하는 CSS가 달라 인라인 스타일만 쓴다.
function layout(title: string, paragraphs: string[], button?: { label: string; href: string }, foot?: string): string {
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#fbf6ef;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1f2a44">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 20px;font-weight:700;color:#c9573f">♪ Only U song</p>
<div style="background:#fff;border-radius:16px;padding:28px 24px;border:1px solid #e8dccb">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.4">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#55607a">${p}</p>`).join("\n")}
${button ? `<p style="margin:24px 0 8px"><a href="${esc(button.href)}" style="display:inline-block;background:#e8735f;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${esc(button.label)}</a></p>` : ""}
${foot ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#8a8f9c">${foot}</p>` : ""}
</div>
<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#8a8f9c">이 메일은 Only U song 주문 안내로 발송됐어요. 문의: ${esc(BUSINESS.email)} · ${esc(BUSINESS.phone)}<br>상호 ${esc(BUSINESS.name)} · 사업자등록번호 ${esc(BUSINESS.regNo)}</p>
</div></body></html>`;
}

type OrderInfo = { email: string; order_no: string; gift_token: string; gift_enabled: number; title: string | null; error: string | null };

async function orderInfo(orderId: string): Promise<OrderInfo | null> {
  const db = await getDb();
  return db
    .prepare(
      `SELECT o.email, o.order_no, o.gift_token, o.gift_enabled, s.title, s.error
       FROM orders o LEFT JOIN songs s ON s.order_id = o.id WHERE o.id = ?`,
    )
    .bind(orderId)
    .first<OrderInfo>();
}

/** 관리자 화면의 시험 발송. 운영자 메일(ADMIN_EMAIL)로 보낸다. 보냈으면 true. */
export async function mailTest(env: CloudflareEnv): Promise<boolean> {
  if (!mailEnabled(env) || !env.ADMIN_EMAIL) return false;
  try {
    await env.EMAIL!.send({
      from: sender(env),
      to: env.ADMIN_EMAIL,
      subject: "[Only U song] 알림 메일 시험 발송",
      html: layout("알림 메일이 잘 도착했어요", ["관리자 화면에서 보낸 시험 메일이에요. 노래 완성·제작 실패 알림도 이 주소에서 발송돼요."]),
      text: "관리자 화면에서 보낸 시험 메일이에요. 노래 완성·제작 실패 알림도 이 주소에서 발송돼요.",
      replyTo: BUSINESS.email,
    });
    return true;
  } catch (e) {
    console.error("test mail failed", e);
    return false;
  }
}

/** 노래가 완성됐을 때 주문자에게 알린다. 처음 완성과 수정본 완성을 구분해 쓴다. */
export async function mailSongReady(env: CloudflareEnv, orderId: string, revised: boolean): Promise<void> {
  if (!mailEnabled(env)) return;
  const o = await orderInfo(orderId);
  if (!o) return;
  const site = env.SITE_URL.replace(/\/$/, "");
  const title = o.title ?? "맞춤 노래";
  const findUrl = `${site}/find?no=${encodeURIComponent(o.order_no)}`;
  const giftUrl = `${site}/gift/${o.gift_token}`;
  const subject = revised ? `[Only U song] 수정한 노래가 완성됐어요 - ${title}` : `[Only U song] 노래가 완성됐어요 - ${title}`;
  const lines = [
    revised ? `요청하신 대로 다시 만든 노래 「${esc(title)}」가 완성됐어요.` : `주문하신 노래 「${esc(title)}」가 완성됐어요.`,
    `주문번호: <strong>${esc(o.order_no)}</strong>`,
    "주문한 기기에서는 &lsquo;내 노래&rsquo;에서 바로 들을 수 있어요. 다른 기기에서는 아래 버튼을 누른 뒤 주문할 때 쓴 이메일을 입력하면 열려요.",
  ];
  if (o.gift_enabled) lines.push(`받는 분께 보낼 선물 링크: <a href="${esc(giftUrl)}" style="color:#c9573f">${esc(giftUrl)}</a>`);
  // 후기 이벤트 안내(처음 완성 때만).
  if (!revised)
    lines.push(
      `🎁 노래를 처음 듣는 순간을 영상으로 보내 주시면 MP3·가사 카드(올인원은 다음 노래 1곡)를 드려요. <a href="${esc(site)}/review-event" style="color:#c9573f">후기 이벤트 보기</a>`,
    );
  await send(env, {
    to: o.email,
    subject,
    html: layout(revised ? "수정한 노래가 완성됐어요" : "노래가 완성됐어요", lines, { label: "내 노래 열기", href: findUrl }),
    text: [
      revised ? `요청하신 대로 다시 만든 노래 「${title}」가 완성됐어요.` : `주문하신 노래 「${title}」가 완성됐어요.`,
      `주문번호: ${o.order_no}`,
      `내 노래 열기: ${findUrl} (주문할 때 쓴 이메일 입력)`,
      o.gift_enabled ? `선물 링크: ${giftUrl}` : "",
      revised ? "" : `후기 이벤트: 노래를 처음 듣는 순간을 영상으로 보내 주시면 혜택을 드려요. ${site}/review-event`,
      `문의: ${BUSINESS.email} · ${BUSINESS.phone}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

/** 제작에 실패했을 때 주문자에게는 안내를, 운영자(ADMIN_EMAIL)에게는 오류 내용을 보낸다. */
export async function mailSongFailed(env: CloudflareEnv, orderId: string): Promise<void> {
  if (!mailEnabled(env)) return;
  const o = await orderInfo(orderId);
  if (!o) return;
  const site = env.SITE_URL.replace(/\/$/, "");
  await send(env, {
    to: o.email,
    subject: "[Only U song] 노래 제작이 늦어지고 있어요",
    html: layout(
      "노래 제작이 늦어지고 있어요",
      [
        `주문번호 <strong>${esc(o.order_no)}</strong>의 노래를 만드는 중에 문제가 생겼어요. 확인 후 추가 결제 없이 다시 만들어 드릴게요.`,
        "다시 만들지 않고 환불을 원하시면 이 메일에 답장해 주세요. 결제 금액 전액을 환불해 드려요.",
      ],
      undefined,
      "불편을 드려 죄송합니다.",
    ),
    text: `주문번호 ${o.order_no}의 노래를 만드는 중에 문제가 생겼어요. 확인 후 추가 결제 없이 다시 만들어 드릴게요.\n환불을 원하시면 이 메일에 답장해 주세요.\n문의: ${BUSINESS.email} · ${BUSINESS.phone}`,
  });
  if (env.ADMIN_EMAIL) {
    await send(env, {
      to: env.ADMIN_EMAIL,
      subject: `[관리자] 제작 실패 ${o.order_no}`,
      html: layout(`제작 실패 ${o.order_no}`, [`오류: ${esc(o.error ?? "알 수 없음")}`, "관리자 화면에서 &lsquo;무료로 다시 만들기&rsquo;로 처리해 주세요."], {
        label: "관리자 화면 열기",
        href: `${site}/admin`,
      }),
      text: `제작 실패 ${o.order_no}\n오류: ${o.error ?? "알 수 없음"}\n관리자 화면: ${site}/admin`,
    });
  }
}

/** 후기 혜택을 지급했을 때 주문자에게 알린다. 쿠폰이면 쿠폰 번호와 쓰는 방법을 함께 보낸다. */
export async function mailReward(env: CloudflareEnv, orderId: string, benefit: "addons" | "card" | "coupon", couponCode?: string): Promise<void> {
  if (!mailEnabled(env)) return;
  const o = await orderInfo(orderId);
  if (!o) return;
  const site = env.SITE_URL.replace(/\/$/, "");
  const findUrl = `${site}/find?no=${encodeURIComponent(o.order_no)}`;
  const thanks = "소중한 후기를 보내 주셔서 고맙습니다.";
  let lines: string[];
  let text: string;
  let button: { label: string; href: string };
  if (benefit === "coupon" && couponCode) {
    lines = [
      thanks,
      `후기 혜택으로 <strong>다음 노래 1곡 무료 쿠폰</strong>을 드려요. (노래 듣기 · 선물 링크 포함, MP3와 가사 카드는 빠져요)`,
      `쿠폰 번호: <strong style="font-size:18px;letter-spacing:1px">${esc(couponCode)}</strong>`,
      "노래 만들기에서 이야기를 쓰고, 주문 확인 화면의 &lsquo;쿠폰 번호&rsquo; 칸에 입력하면 결제 없이 바로 만들어져요. 쿠폰은 1년 동안 한 번 쓸 수 있어요.",
    ];
    button = { label: "새 노래 만들기", href: `${site}/create` };
    text = `${thanks}\n후기 혜택: 다음 노래 1곡 무료 쿠폰(노래 듣기만)\n쿠폰 번호: ${couponCode}\n노래 만들기(${site}/create) → 주문 확인의 쿠폰 번호 칸에 입력하세요. 1년 동안 한 번 쓸 수 있어요.`;
  } else {
    const what = benefit === "addons" ? "MP3 다운로드와 가사 카드" : "가사 카드";
    lines = [thanks, `후기 혜택으로 <strong>${what}</strong>를 열어 드렸어요. &lsquo;내 노래&rsquo;에서 바로 받을 수 있어요.`, `주문번호: <strong>${esc(o.order_no)}</strong>`];
    button = { label: "내 노래 열기", href: findUrl };
    text = `${thanks}\n후기 혜택으로 ${what}를 열어 드렸어요. 내 노래: ${findUrl} (주문할 때 쓴 이메일 입력)\n주문번호: ${o.order_no}`;
  }
  await send(env, {
    to: o.email,
    subject: "[Only U song] 후기 혜택이 도착했어요",
    html: layout("후기 혜택이 도착했어요", lines, button),
    text: `${text}\n문의: ${BUSINESS.email} · ${BUSINESS.phone}`,
  });
}
