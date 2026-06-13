import type { ParsedProblem, SolutionDraft, CommitArtifact } from "./types";
import { buildCommitMessage, buildFilePath, buildIndexRow } from "./path";

function section(title: string, body: string): string {
  const content = body.trim().length > 0 ? body.trim() : "_(작성 안 됨)_";
  return `## ${title}\n\n${content}\n`;
}

function javaBlock(code: string): string {
  const content = code.trim().length > 0 ? code.trim() : "// 작성 안 됨";
  return "```java\n" + content + "\n```";
}

/** PRD 4. 마크다운 템플릿 규칙대로 README 본문 생성 */
export function buildReadme(problem: ParsedProblem, draft: SolutionDraft): string {
  const lines: string[] = [];

  lines.push(`# ${problem.title}`);
  lines.push("");
  lines.push(`> 출처: ${problem.url}  `);
  lines.push(`> 날짜: ${draft.date}  `);
  lines.push(`> 난이도: ${draft.level}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(section("문제 설명", problem.description));
  lines.push(section("제한사항", problem.constraints));

  let examples = problem.examples.trim();
  if (problem.examplesDescription.trim()) {
    examples += `\n\n${problem.examplesDescription.trim()}`;
  }
  lines.push(section("입출력 예", examples));

  lines.push("---");
  lines.push("");
  lines.push("## 나의 풀이");
  lines.push("");
  lines.push("### 처음에 내가 짠 코드");
  lines.push("");
  lines.push(javaBlock(draft.firstCode));
  lines.push("");
  lines.push("**잘못된 부분**");
  lines.push("");
  lines.push(draft.mistake.trim() || "- ");
  lines.push("");
  lines.push("### 최종 답안 코드");
  lines.push("");
  lines.push(javaBlock(draft.finalCode));
  lines.push("");
  lines.push(section("배운 점 / 느낀점", draft.learned));

  const approachBody = [draft.approach, draft.aiHint]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n\n");
  lines.push(section("다른 접근법", approachBody));

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** 에디터 상태로부터 커밋 산출물(경로/메시지/본문/인덱스행)을 한 번에 생성 */
export function buildArtifact(
  problem: ParsedProblem,
  draft: SolutionDraft
): CommitArtifact {
  return {
    filePath: buildFilePath(draft.level, problem.number, problem.title),
    commitMessage: buildCommitMessage(draft.level, problem.title, draft.date),
    readme: buildReadme(problem, draft),
    indexRow: buildIndexRow(draft.level, problem.number, problem.title, draft.date),
  };
}

const INDEX_HEADER = [
  "# 📒 알고리즘 풀이 인덱스",
  "",
  "| 날짜 | 난이도 | 문제 | 링크 |",
  "|------|--------|------|------|",
].join("\n");

/** INDEX.md 미리보기: 헤더 + 새 행 한 줄 (실제 레포에선 기존 행들 위/아래에 누적) */
export function buildIndexPreview(indexRow: string): string {
  return `${INDEX_HEADER}\n${indexRow}\n`;
}

/**
 * 기존 INDEX.md 내용에 새 행을 병합.
 * - 같은 파일 경로의 행이 이미 있으면 교체(재기록 = 덮어쓰기)
 * - 없으면 마지막 테이블 행 뒤에 추가
 * - INDEX.md가 없으면 헤더부터 새로 생성
 */
export function mergeIndex(
  existing: string | null,
  newRow: string,
  filePath: string
): string {
  if (!existing || !existing.trim()) {
    return buildIndexPreview(newRow);
  }

  const link = `(./${filePath})`;
  const lines = existing.replace(/\s+$/, "").split("\n");

  const dup = lines.findIndex((l) => l.includes(link));
  if (dup >= 0) {
    lines[dup] = newRow;
    return lines.join("\n") + "\n";
  }

  let lastTableRow = -1;
  lines.forEach((l, i) => {
    if (/^\s*\|/.test(l)) lastTableRow = i;
  });

  if (lastTableRow >= 0) {
    lines.splice(lastTableRow + 1, 0, newRow);
  } else {
    lines.push("", newRow);
  }
  return lines.join("\n") + "\n";
}
