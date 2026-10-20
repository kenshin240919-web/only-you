import "server-only";
import { BUSINESS } from "./business";
import { getDb } from "./db";

// 거래 알림 메일. Cloudflare Email Service(Workers 유료 플랜에 월 3,000통 포함)로 보낸다.
// EMAIL 바인딩과 MAIL_FROM이 모두 있어야 보내고, 없으면 조용히 건너뛴다. 메일 실패가 주문 처리를 막지 않는다.

type Mail = { to: string; subject: string; text: string; html: string };

export function mailEnabled(env: CloudflareEnv): boolean {
  return Boolean(env.EMAIL && env.MAIL_FROM);
}

async function send(env: CloudflareEnv, m: Mail): Promise<void> {
  if (!env.EMAIL || !env.MAIL_FROM) return;
  try {
    await env.EMAIL.send({ from: env.MAIL_FROM, to: m.to, subject: m.subject, text: m.text, html: m.html, replyTo: BUSINESS.email });
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
  await send(env, {
    to: o.email,
    subject,
    html: layout(revised ? "수정한 노래가 완성됐어요" : "노래가 완성됐어요", lines, { label: "내 노래 열기", href: findUrl }),
    text: [
      revised ? `요청하신 대로 다시 만든 노래 「${title}」가 완성됐어요.` : `주문하신 노래 「${title}」가 완성됐어요.`,
      `주문번호: ${o.order_no}`,
      `내 노래 열기: ${findUrl} (주문할 때 쓴 이메일 입력)`,
      o.gift_enabled ? `선물 링크: ${giftUrl}` : "",
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
