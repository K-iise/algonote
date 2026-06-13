import { NextResponse } from "next/server";
import { exchangeCodeForToken, getAuthUser } from "@/lib/github";
import { consumeOAuthState, setSession } from "@/lib/session";

export const runtime = "nodejs";

/** GitHub 콜백: code 검증 → 토큰 교환 → 세션 저장 → 홈으로 */
export async function GET(req: Request) {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const expected = await consumeOAuthState();
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${base}/?auth=error`);
  }

  try {
    const token = await exchangeCodeForToken(code);
    const user = await getAuthUser(token);
    await setSession({
      token,
      login: user.login,
      name: user.name,
      avatar: user.avatar,
    });
    return NextResponse.redirect(`${base}/?auth=ok`);
  } catch {
    return NextResponse.redirect(`${base}/?auth=error`);
  }
}
