import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

/** 현재 로그인 사용자 정보(토큰 제외) 반환 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: { login: session.login, name: session.name, avatar: session.avatar },
  });
}
