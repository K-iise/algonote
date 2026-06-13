const API = "https://api.github.com";

export interface GitHubUser {
  login: string;
  name: string;
  avatar: string;
}

export interface CommitResult {
  path: string;
  htmlUrl: string;
  commitSha: string;
  action: "created" | "updated";
}

async function gh(
  token: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/** OAuth code → access token 교환 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(data.error_description || "토큰 교환 실패");
  }
  return data.access_token as string;
}

export async function getAuthUser(token: string): Promise<GitHubUser> {
  const res = await gh(token, "/user");
  if (!res.ok) throw new Error(`사용자 조회 실패: ${res.status}`);
  const u = await res.json();
  return {
    login: u.login,
    name: u.name || u.login,
    avatar: u.avatar_url,
  };
}

interface ExistingFile {
  sha: string;
  content: string; // 디코드된 UTF-8 텍스트
}

/** 파일 조회. 없으면(404) null */
export async function getFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<ExistingFile | null> {
  const res = await gh(
    token,
    `/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`파일 조회 실패(${path}): ${res.status}`);
  const data = await res.json();
  const content = Buffer.from(data.content ?? "", "base64").toString("utf8");
  return { sha: data.sha, content };
}

/** 파일 생성/갱신 (PUT contents). sha가 있으면 갱신, 없으면 생성 */
export async function putFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  params: { message: string; text: string; branch: string; sha?: string }
): Promise<CommitResult> {
  const body: Record<string, unknown> = {
    message: params.message,
    content: Buffer.from(params.text, "utf8").toString("base64"),
    branch: params.branch,
  };
  if (params.sha) body.sha = params.sha;

  const res = await gh(token, `/repos/${owner}/${repo}/contents/${encodePath(path)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`커밋 실패(${path}): ${res.status} ${err.message ?? ""}`);
  }
  const data = await res.json();
  return {
    path,
    htmlUrl: data.content?.html_url ?? "",
    commitSha: data.commit?.sha ?? "",
    action: params.sha ? "updated" : "created",
  };
}

/** 레포 존재/접근 가능 여부 + 기본 브랜치 */
export async function getRepoMeta(
  token: string,
  owner: string,
  repo: string
): Promise<{ exists: boolean; defaultBranch?: string; permissionPush?: boolean }> {
  const res = await gh(token, `/repos/${owner}/${repo}`);
  if (res.status === 404) return { exists: false };
  if (!res.ok) throw new Error(`레포 조회 실패: ${res.status}`);
  const data = await res.json();
  return {
    exists: true,
    defaultBranch: data.default_branch,
    permissionPush: data.permissions?.push ?? false,
  };
}

/** 경로 세그먼트별 인코딩 (슬래시는 유지, 한글/공백 등만 인코딩) */
function encodePath(path: string): string {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}
