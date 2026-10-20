import { cookieHeader } from "@/lib/admin";

export async function POST() {
  return new Response(null, { status: 204, headers: { "set-cookie": cookieHeader("", 0) } });
}
