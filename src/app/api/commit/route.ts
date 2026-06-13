import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getFile, putFile, getRepoMeta } from "@/lib/github";
import { mergeIndex } from "@/lib/template";

export const runtime = "nodejs";

interface CommitBody {
  owner: string;
  repo: string;
  branch?: string;
  filePath: string;
  commitMessage: string;
  readme: string;
  indexRow: string;
  overwrite?: boolean; // 동일 파일 존재 시 덮어쓸지
}

/**
 * 실제 GitHub 커밋:
 *  1) README.md 생성/갱신
 *  2) 루트 INDEX.md 읽어 새 행 병합 후 갱신
 * contents API 라 두 커밋으로 나뉜다.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let b: CommitBody;
  try {
    b = (await req.json()) as CommitBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const owner = (b.owner ?? "").trim();
  const repo = (b.repo ?? "").trim();
  const branch = (b.branch ?? "").trim() || "main";

  if (!owner || !repo || !b.filePath || !b.readme) {
    return NextResponse.json(
      { error: "owner/repo/filePath/readme 가 필요합니다." },
      { status: 400 }
    );
  }

  const token = session.token;

  try {
    // 0) 레포 존재 확인 (없으면 명확한 안내)
    const meta = await getRepoMeta(token, owner, repo);
    if (!meta.exists) {
      return NextResponse.json(
        { error: "no_repo", message: `${owner}/${repo} 레포가 없습니다. '레포 확인 → 생성' 후 다시 시도하세요.` },
        { status: 404 }
      );
    }

    // 1) README.md
    const existingReadme = await getFile(token, owner, repo, b.filePath, branch);
    if (existingReadme && !b.overwrite) {
      return NextResponse.json(
        { error: "duplicate", message: "이미 같은 문제 기록이 존재합니다.", filePath: b.filePath },
        { status: 409 }
      );
    }
    const readmeResult = await putFile(token, owner, repo, b.filePath, {
      message: b.commitMessage,
      text: b.readme,
      branch,
      sha: existingReadme?.sha,
    });

    // 2) INDEX.md
    const existingIndex = await getFile(token, owner, repo, "INDEX.md", branch);
    const mergedIndex = mergeIndex(existingIndex?.content ?? null, b.indexRow, b.filePath);
    const indexResult = await putFile(token, owner, repo, "INDEX.md", {
      message: `docs: update INDEX.md (${b.filePath})`,
      text: mergedIndex,
      branch,
      sha: existingIndex?.sha,
    });

    return NextResponse.json({
      ok: true,
      readme: readmeResult,
      index: indexResult,
      repoUrl: `https://github.com/${owner}/${repo}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "커밋 중 오류";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
