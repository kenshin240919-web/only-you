// Cloudflare Email Service(이메일 발송) 바인딩. 정식 도메인을 이메일 서비스에 등록한 뒤 wrangler.jsonc에
// "send_email": [{ "name": "EMAIL" }]를 추가하면 생긴다. 없으면 메일을 보내지 않는다.
interface EmailServiceBinding {
  send(message: {
    to: string | string[];
    from: string | { email: string; name?: string };
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
  }): Promise<{ messageId: string }>;
}

interface CloudflareEnv {
  EMAIL?: EmailServiceBinding;
}
