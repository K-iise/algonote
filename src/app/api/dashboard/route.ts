import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getFile } from "@/lib/github";
import { parseIndex, computeStats } from "@/lib/dashboard";

export const runtime = "nodejs";

/** 내 레포의 INDEX.md 를 읽어 문제 목록 + 통계/스트릭 반환 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let owner = "";
  let repo = "";
  let branch = "main";
  try {
    const body = await req.json();
    owner = String(body?.owner ?? "").trim();
    repo = String(body?.repo ?? "").trim();
    branch = String(body?.branch ?? "").trim() || "main";
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  if (!owner || !repo) {
    return NextResponse.json({ error: "owner/repo 가 필요합니다." }, { status: 400 });
  }

  try {
    const index = await getFile(session.token, owner, repo, "INDEX.md", branch);
    if (!index) {
      return NextResponse.json({
        hasIndex: false,
        rows: [],
        stats: { total: 0, byLevel: {}, byDate: {}, currentStreak: 0, longestStreak: 0, activeDays: 0 },
      });
    }
    const rows = parseIndex(index.content);
    const stats = computeStats(rows);
    return NextResponse.json({ hasIndex: true, rows, stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "대시보드 조회 오류";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
