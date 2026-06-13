import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getRepoMeta } from "@/lib/github";

export const runtime = "nodejs";

/** owner/repo 접근 가능 여부 + 기본 브랜치/푸시 권한 확인 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let owner = "";
  let repo = "";
  try {
    const body = await req.json();
    owner = String(body?.owner ?? "").trim();
    repo = String(body?.repo ?? "").trim();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!owner || !repo) {
    return NextResponse.json({ error: "owner/repo 가 필요합니다." }, { status: 400 });
  }

  try {
    const meta = await getRepoMeta(session.token, owner, repo);
    return NextResponse.json(meta);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "오류";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
