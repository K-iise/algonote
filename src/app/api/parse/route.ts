import { NextResponse } from "next/server";
import { fetchAndParse, isProgrammersUrl } from "@/lib/parser";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let url: string;
  try {
    const body = await req.json();
    url = String(body?.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "URL이 필요합니다." }, { status: 400 });
  }
  if (!isProgrammersUrl(url)) {
    return NextResponse.json(
      { error: "프로그래머스 레슨 URL 형식이 아닙니다. (.../learn/courses/30/lessons/번호)" },
      { status: 400 }
    );
  }

  try {
    const problem = await fetchAndParse(url);
    // 제목조차 못 뽑으면 파싱 실패로 간주 -> 클라이언트가 수동입력 fallback
    const ok = Boolean(problem.title || problem.description);
    return NextResponse.json({ problem, ok });
  } catch (e) {
    const message = e instanceof Error ? e.message : "파싱 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
