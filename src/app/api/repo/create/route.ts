import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createRepo } from "@/lib/github";

export const runtime = "nodejs";

/** 로그인 사용자(또는 그가 권한 가진 org) 아래에 레포 생성 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let owner = "";
  let repo = "";
  let isPrivate = false;
  try {
    const body = await req.json();
    owner = String(body?.owner ?? "").trim() || session.login;
    repo = String(body?.repo ?? "").trim();
    isPrivate = Boolean(body?.private);
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!repo) {
    return NextResponse.json({ error: "레포 이름이 필요합니다." }, { status: 400 });
  }

  try {
    const result = await createRepo(session.token, {
      owner,
      repo,
      private: isPrivate,
      login: session.login,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "레포 생성 오류";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
