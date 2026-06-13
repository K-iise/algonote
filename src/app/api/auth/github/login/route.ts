import { NextResponse } from "next/server";
import crypto from "crypto";
import { setOAuthState } from "@/lib/session";

export const runtime = "nodejs";

/** GitHub OAuth authorize 페이지로 리다이렉트 */
export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID 가 설정되지 않았습니다. .env.local 을 확인하세요." },
      { status: 500 }
    );
  }

  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const scope = process.env.GITHUB_OAUTH_SCOPE || "public_repo";
  const state = crypto.randomBytes(16).toString("hex");
  await setOAuthState(state);

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${base}/api/auth/github/callback`);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
