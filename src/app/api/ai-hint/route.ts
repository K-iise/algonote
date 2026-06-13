import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * AI 접근법 힌트 (선택 기능).
 *
 * MVP에서는 mock 응답을 돌려준다. 실제 연동 시:
 *   const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 *   const msg = await anthropic.messages.create({ model: "claude-...", ... });
 * 정답 코드를 직접 주지 않고 "방향/대안 접근법"만 제시하도록 시스템 프롬프트를 건다.
 */
export async function POST(req: Request) {
  let title = "";
  let description = "";
  try {
    const body = await req.json();
    title = String(body?.title ?? "").trim();
    description = String(body?.description ?? "").trim();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  // --- mock 힌트 생성 (스포일러 없이 방향만) ---
  const topic = title || "이 문제";
  const hint = [
    `**${topic}** 에 대한 다른 접근법 메모 (mock):`,
    "",
    "- 완전탐색으로 풀었다면, 입력 크기를 보고 시간복잡도가 충분한지 먼저 점검해보세요.",
    "- 자료구조를 바꿔보세요: 큐/스택/우선순위큐(힙) 중 무엇이 더 자연스러운가요?",
    "- 정렬을 한 번 해두면 탐색이 단순해지는 경우가 많습니다 (예: 투 포인터, 그리디).",
    "- 같은 계산을 반복한다면 메모이제이션/DP로 캐싱할 여지가 있는지 확인하세요.",
    "",
    "> 정답 코드 대신 방향만 제시합니다. 실제 배포 시 Anthropic API(Claude)로 교체하세요.",
  ].join("\n");

  // 약간의 지연으로 실제 호출처럼 보이게
  await new Promise((r) => setTimeout(r, 350));

  return NextResponse.json({ hint, mock: true, usedDescription: Boolean(description) });
}
