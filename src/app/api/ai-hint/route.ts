import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // LLM 응답 대기 여유

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";

const SYSTEM_PROMPT = `당신은 알고리즘 학습을 돕는 멘토입니다.
사용자가 푼 프로그래머스 문제에 대해 "다른 접근법"을 한국어로 제시하세요.

규칙:
- 정답 코드를 통째로 주지 마세요. 방향/아이디어/자료구조 힌트만.
- 2~3가지 대안 접근을 제시하고, 가능하면 시간복잡도를 간단히 비교하세요.
- 마크다운(불릿) 형식, 5~8줄 이내로 간결하게.
- 스포일러를 줄이고, 사용자가 스스로 떠올릴 수 있게 유도하세요.`;

/** mock 힌트 (API 키 없을 때 폴백) */
function mockHint(title: string): string {
  const topic = title || "이 문제";
  return [
    `**${topic}** 에 대한 다른 접근법 메모 (mock — AI 키 미설정):`,
    "",
    "- 완전탐색이라면 입력 크기를 보고 시간복잡도가 충분한지 먼저 점검하세요.",
    "- 자료구조를 바꿔보세요: 큐/스택/우선순위큐(힙) 중 무엇이 자연스러운가요?",
    "- 정렬을 먼저 해두면 탐색이 단순해지는 경우가 많습니다 (투 포인터, 그리디).",
    "- 같은 계산을 반복한다면 메모이제이션/DP로 캐싱할 여지가 있는지 확인하세요.",
    "",
    "> `AI_API_KEY` 를 설정하면 실제 AI가 문제 맞춤 힌트를 줍니다.",
  ].join("\n");
}

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

  const apiKey = process.env.AI_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = process.env.AI_MODEL;

  // 키가 없으면 mock 으로 폴백 (앱이 항상 동작하게)
  if (!apiKey || !model) {
    return NextResponse.json({ hint: mockHint(title), mock: true });
  }

  const userPrompt = [
    `문제 제목: ${title || "(없음)"}`,
    "",
    "문제 설명:",
    description ? description.slice(0, 4000) : "(설명 없음)",
  ].join("\n");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 600,
        stream: false,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `AI 응답 오류 (${res.status}). 모델 ID/키를 확인하세요.`, detail: errText.slice(0, 300) },
        { status: 502 }
      );
    }

    const data = await res.json();
    const hint = data?.choices?.[0]?.message?.content?.trim();
    if (!hint) {
      return NextResponse.json({ error: "AI 응답이 비어 있습니다." }, { status: 502 });
    }
    return NextResponse.json({ hint, mock: false, model });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI 호출 실패";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
