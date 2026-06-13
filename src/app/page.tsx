"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeEditor from "@/components/CodeEditor";
import Toggle from "@/components/Toggle";
import Dashboard from "@/components/Dashboard";
import type { Level, ParsedProblem, SolutionDraft } from "@/lib/types";
import { buildArtifact, buildIndexPreview } from "@/lib/template";
import { extractLessonNumber, isProgrammersUrl } from "@/lib/parser";
import { today } from "@/lib/path";
import { decodeImport } from "@/lib/importPayload";

const ALLOWED_LEVELS = ["lv1", "lv2", "lv3", "lv4", "lv5"];

const EMPTY_PROBLEM: ParsedProblem = {
  number: "",
  title: "",
  url: "",
  level: null,
  description: "",
  constraints: "",
  examples: "",
  examplesDescription: "",
};

const LEVELS: Level[] = ["lv1", "lv2", "lv3", "lv4", "lv5"];

type PreviewTab = "readme" | "index" | "commit";

interface GitHubUser {
  login: string;
  name: string;
  avatar: string;
}

interface CommitResult {
  ok: boolean;
  readme: { htmlUrl: string; action: string };
  index: { htmlUrl: string };
  repoUrl: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [problem, setProblem] = useState<ParsedProblem>(EMPTY_PROBLEM);
  const [draft, setDraft] = useState<SolutionDraft>({
    level: "lv2",
    date: today(),
    firstCode: "",
    mistake: "",
    finalCode: "",
    learned: "",
    approach: "",
    aiHint: "",
  });

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [tab, setTab] = useState<PreviewTab>("readme");
  const [view, setView] = useState<"editor" | "dashboard">("editor");

  // --- GitHub 연동 상태 ---
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [needOverwrite, setNeedOverwrite] = useState(false);

  // 레포 존재 확인 / 생성
  type RepoStatus = "unknown" | "checking" | "exists" | "missing" | "creating";
  const [repoStatus, setRepoStatus] = useState<RepoStatus>("unknown");
  const [repoPrivate, setRepoPrivate] = useState(false);
  const [repoMsg, setRepoMsg] = useState<string | null>(null);

  // 마운트 시: 로그인 상태 조회 + 레포 설정 복원
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
    try {
      const saved = JSON.parse(localStorage.getItem("algonote_repo") || "{}");
      if (saved.owner) setOwner(saved.owner);
      if (saved.repo) setRepo(saved.repo);
      if (saved.branch) setBranch(saved.branch);
    } catch {
      /* noop */
    }
    // 확장프로그램 핸드오프: #import=... 페이로드를 받아 폼 자동 채움
    if (typeof window !== "undefined" && window.location.hash.startsWith("#import=")) {
      const payload = decodeImport(window.location.hash.slice("#import=".length));
      if (payload) {
        const level =
          payload.level && ALLOWED_LEVELS.includes(payload.level)
            ? (payload.level as Level)
            : null;
        setUrl(payload.url || "");
        setProblem({
          number: payload.number || extractLessonNumber(payload.url || "") || "",
          title: payload.title || "",
          url: payload.url || "",
          level,
          description: payload.description || "",
          constraints: payload.constraints || "",
          examples: payload.examples || "",
          examplesDescription: payload.examplesDescription || "",
        });
        if (level) setDraft((prev) => ({ ...prev, level }));
        if (payload.finalCode) setDraft((prev) => ({ ...prev, finalCode: payload.finalCode }));
        setLoaded(true);
      }
      window.history.replaceState({}, "", "/");
    }

    // ?auth=ok 후 URL 정리
    if (typeof window !== "undefined" && window.location.search.includes("auth=")) {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // 레포 설정 저장
  useEffect(() => {
    localStorage.setItem("algonote_repo", JSON.stringify({ owner, repo, branch }));
  }, [owner, repo, branch]);

  const setP = (patch: Partial<ParsedProblem>) =>
    setProblem((prev) => ({ ...prev, ...patch }));
  const setD = (patch: Partial<SolutionDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  // --- 문제 불러오기 (서버사이드 스크래핑) ---
  async function loadProblem() {
    setParseError(null);
    setCommitResult(null);
    if (!isProgrammersUrl(url)) {
      setParseError("프로그래머스 레슨 URL 형식이 아닙니다. 수동으로 입력할 수도 있어요.");
      // fallback: 빈 폼이라도 열어준다
      setProblem({ ...EMPTY_PROBLEM, url, number: extractLessonNumber(url) ?? "" });
      setLoaded(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "파싱 실패");
      }
      const p: ParsedProblem = data.problem;
      setProblem(p);
      if (!data.ok) {
        setParseError("자동 파싱 결과가 비어 있습니다. 아래에서 직접 채워주세요.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "오류";
      setParseError(`자동 파싱 실패 (${msg}). 아래에서 직접 입력하세요.`);
      setProblem({ ...EMPTY_PROBLEM, url, number: extractLessonNumber(url) ?? "" });
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  // --- AI 힌트 가져오기 ---
  async function fetchAiHint() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: problem.title, description: problem.description }),
      });
      const data = await res.json();
      if (res.ok) setD({ aiHint: data.hint });
    } finally {
      setAiLoading(false);
    }
  }

  // --- 산출물 계산 ---
  const artifact = useMemo(() => {
    const p = { ...problem, level: draft.level };
    return buildArtifact(p, draft);
  }, [problem, draft]);

  const indexPreview = useMemo(
    () => buildIndexPreview(artifact.indexRow),
    [artifact.indexRow]
  );

  const draftReady = problem.title.trim() && problem.number.trim() && draft.finalCode.trim();
  const canCommit = draftReady && user && owner.trim() && repo.trim();

  function download() {
    const blob = new Blob([artifact.readme], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function login() {
    window.location.href = "/api/auth/github/login";
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setCommitResult(null);
  }

  async function checkRepo() {
    if (!owner.trim() || !repo.trim()) return;
    setRepoStatus("checking");
    setRepoMsg(null);
    try {
      const res = await fetch("/api/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: owner.trim(), repo: repo.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "확인 실패");
      if (d.exists) {
        setRepoStatus("exists");
        if (d.defaultBranch) setBranch(d.defaultBranch);
        setRepoMsg(d.permissionPush === false ? "⚠ 이 레포에 푸시 권한이 없습니다." : null);
      } else {
        setRepoStatus("missing");
      }
    } catch (e) {
      setRepoStatus("unknown");
      setRepoMsg(e instanceof Error ? e.message : "오류");
    }
  }

  async function createRepository() {
    setRepoStatus("creating");
    setRepoMsg(null);
    try {
      const res = await fetch("/api/repo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: owner.trim(), repo: repo.trim(), private: repoPrivate }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "생성 실패");
      setRepoStatus("exists");
      if (d.defaultBranch) setBranch(d.defaultBranch);
      setRepoMsg("✓ 레포를 새로 만들었습니다.");
    } catch (e) {
      setRepoStatus("missing");
      setRepoMsg(e instanceof Error ? e.message : "오류");
    }
  }

  async function commit(overwrite = false) {
    setCommitting(true);
    setCommitError(null);
    setNeedOverwrite(false);
    setCommitResult(null);
    try {
      const res = await fetch("/api/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: owner.trim(),
          repo: repo.trim(),
          branch: branch.trim() || "main",
          filePath: artifact.filePath,
          commitMessage: artifact.commitMessage,
          readme: artifact.readme,
          indexRow: artifact.indexRow,
          overwrite,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setNeedOverwrite(true);
        setCommitError(data.message || "이미 같은 문제 기록이 존재합니다.");
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || data.error || "커밋 실패");
      }
      setCommitResult(data);
    } catch (e) {
      setCommitError(e instanceof Error ? e.message : "커밋 중 오류");
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="app">
      <header className="top">
        <h1>
          <span className="logo">Algo</span>Note
        </h1>
        <span className="tagline">프로그래머스 풀이 → 마크다운 → GitHub 기록 자동화</span>
        <span className="view-nav">
          <button
            className={view === "editor" ? "active" : ""}
            onClick={() => setView("editor")}
          >
            ✍️ 기록
          </button>
          <button
            className={view === "dashboard" ? "active" : ""}
            onClick={() => setView("dashboard")}
          >
            📊 내 기록
          </button>
        </span>
      </header>

      {view === "dashboard" && (
        <section className="card">
          <Dashboard owner={owner} repo={repo} branch={branch} loggedIn={!!user} />
        </section>
      )}

      {view === "editor" && (
      <div className="grid">
        {/* ===== 왼쪽: 입력 / 에디터 ===== */}
        <div>
          {/* 1. URL */}
          <section className="card">
            <h2>
              <span className="step">1</span> 문제 URL
            </h2>
            <div className="row">
              <input
                type="url"
                placeholder="https://programmers.co.kr/learn/courses/30/lessons/42587"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadProblem()}
              />
              <button
                style={{ flex: "0 0 auto" }}
                onClick={loadProblem}
                disabled={loading || !url.trim()}
              >
                {loading ? <span className="spinner" /> : null}
                문제 불러오기
              </button>
            </div>
            {parseError && <div className="error">{parseError}</div>}
            {!loaded && (
              <div className="hint">
                URL을 넣고 불러오면 제목·설명·입출력 예가 자동으로 채워집니다. 실패해도 아래에서
                직접 입력할 수 있어요.
              </div>
            )}
          </section>

          {loaded && (
            <>
              {/* 2. 문제 정보 */}
              <section className="card">
                <h2>
                  <span className="step">2</span> 문제 정보{" "}
                  <span className="hint" style={{ margin: 0 }}>
                    (자동 채움 · 수정 가능)
                  </span>
                </h2>
                <div className="row">
                  <div style={{ flex: 2 }}>
                    <label>제목</label>
                    <input
                      type="text"
                      value={problem.title}
                      onChange={(e) => setP({ title: e.target.value })}
                      placeholder="프린터"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>문제 번호</label>
                    <input
                      type="text"
                      value={problem.number}
                      onChange={(e) => setP({ number: e.target.value })}
                      placeholder="42587"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>난이도</label>
                    <select
                      value={draft.level}
                      onChange={(e) => setD({ level: e.target.value as Level })}
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label>문제 설명</label>
                <textarea
                  value={problem.description}
                  onChange={(e) => setP({ description: e.target.value })}
                  style={{ minHeight: 90 }}
                />
                <label>제한사항</label>
                <textarea
                  value={problem.constraints}
                  onChange={(e) => setP({ constraints: e.target.value })}
                />
                <label>입출력 예</label>
                <textarea
                  value={problem.examples}
                  onChange={(e) => setP({ examples: e.target.value })}
                />
                <label>입출력 예 설명</label>
                <textarea
                  value={problem.examplesDescription}
                  onChange={(e) => setP({ examplesDescription: e.target.value })}
                />
              </section>

              {/* 3. 나의 풀이 */}
              <section className="card">
                <h2>
                  <span className="step">3</span> 나의 풀이
                </h2>

                <label>처음에 내가 짠 코드</label>
                <CodeEditor
                  value={draft.firstCode}
                  onChange={(v) => setD({ firstCode: v })}
                  placeholder="// 처음 시도한 코드"
                />

                <label>잘못된 부분 / 막힌 포인트</label>
                <textarea
                  value={draft.mistake}
                  onChange={(e) => setD({ mistake: e.target.value })}
                  placeholder="- 큐를 안 써서 우선순위 비교가 꼬였다 ..."
                />

                <label>최종 답안 코드 *</label>
                <CodeEditor
                  value={draft.finalCode}
                  onChange={(v) => setD({ finalCode: v })}
                  placeholder="// 최종 정답 코드"
                />

                <label>배운 점 / 느낀점</label>
                <textarea
                  value={draft.learned}
                  onChange={(e) => setD({ learned: e.target.value })}
                />

                <label>접근법 메모</label>
                <textarea
                  value={draft.approach}
                  onChange={(e) => setD({ approach: e.target.value })}
                />
              </section>

              {/* 3-3. AI 힌트 (선택) */}
              <section className="card">
                <h2>AI 접근법 힌트 (선택)</h2>
                <Toggle
                  on={aiEnabled}
                  onChange={(v) => setAiEnabled(v)}
                  label="AI에게 다른 접근법 제안받기"
                />
                {aiEnabled && (
                  <div style={{ marginTop: 12 }}>
                    <button className="ghost" onClick={fetchAiHint} disabled={aiLoading}>
                      {aiLoading ? <span className="spinner" /> : null}
                      힌트 생성
                    </button>
                    <div className="hint">
                      정답 코드 대신 방향만 제시합니다. (MVP: mock 응답)
                    </div>
                    {draft.aiHint && (
                      <div className="preview" style={{ marginTop: 12, maxHeight: 240 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {draft.aiHint}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* ===== 오른쪽: 미리보기 / 커밋 ===== */}
        <div>
          <section className="card" style={{ position: "sticky", top: 16 }}>
            <h2>미리보기 & 기록</h2>

            <div className="tabs">
              <button
                className={tab === "readme" ? "active" : ""}
                onClick={() => setTab("readme")}
              >
                README.md
              </button>
              <button
                className={tab === "index" ? "active" : ""}
                onClick={() => setTab("index")}
              >
                INDEX.md
              </button>
              <button
                className={tab === "commit" ? "active" : ""}
                onClick={() => setTab("commit")}
              >
                커밋 정보
              </button>
            </div>

            {tab === "readme" && (
              <div className="preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {artifact.readme}
                </ReactMarkdown>
              </div>
            )}

            {tab === "index" && (
              <div className="preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{indexPreview}</ReactMarkdown>
                <div className="hint">루트 INDEX.md 에 위 행이 누적 추가됩니다.</div>
              </div>
            )}

            {tab === "commit" && (
              <div>
                <div className="kv">
                  <span className="k">파일 경로</span>
                  <span className="filepath">{artifact.filePath}</span>
                </div>
                <div className="kv">
                  <span className="k">커밋 메시지</span>
                  <span className="filepath">{artifact.commitMessage}</span>
                </div>
                <div className="kv">
                  <span className="k">INDEX 행</span>
                  <span className="filepath">{artifact.indexRow}</span>
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              {/* GitHub 계정 */}
              {user ? (
                <div className="account">
                  <img src={user.avatar} alt="" className="avatar" />
                  <span>
                    <b>{user.login}</b> 로 로그인됨
                  </span>
                  <button className="ghost small" onClick={logout}>
                    로그아웃
                  </button>
                </div>
              ) : (
                <button className="wide" onClick={login}>
                  🐙 GitHub로 로그인
                </button>
              )}

              {/* 레포 설정 */}
              {user && (
                <div style={{ marginTop: 12 }}>
                  <div className="row">
                    <div style={{ flex: 1 }}>
                      <label>owner</label>
                      <input
                        type="text"
                        value={owner}
                        onChange={(e) => {
                          setOwner(e.target.value);
                          setRepoStatus("unknown");
                        }}
                        placeholder="내 GitHub 아이디"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>repo</label>
                      <input
                        type="text"
                        value={repo}
                        onChange={(e) => {
                          setRepo(e.target.value);
                          setRepoStatus("unknown");
                        }}
                        placeholder="my-algorithm-notes"
                      />
                    </div>
                    <div style={{ flex: "0 0 88px" }}>
                      <label>branch</label>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                      />
                    </div>
                  </div>

                  {/* 레포 존재 확인 / 자동 생성 */}
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="ghost small"
                      onClick={checkRepo}
                      disabled={!owner.trim() || !repo.trim() || repoStatus === "checking"}
                    >
                      {repoStatus === "checking" ? <span className="spinner" /> : null}
                      레포 확인
                    </button>

                    {repoStatus === "exists" && (
                      <span className="ok" style={{ fontSize: 12 }}>
                        ✓ 레포 확인됨 (branch: {branch})
                      </span>
                    )}

                    {(repoStatus === "missing" || repoStatus === "creating") && (
                      <>
                        <span style={{ fontSize: 12, color: "var(--yellow)" }}>
                          레포가 없어요 — 새로 만들까요?
                        </span>
                        <label
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, margin: 0, cursor: "pointer" }}
                        >
                          <input
                            type="checkbox"
                            checked={repoPrivate}
                            onChange={(e) => setRepoPrivate(e.target.checked)}
                            style={{ width: "auto" }}
                          />
                          Private
                        </label>
                        <button
                          className="ghost small"
                          onClick={createRepository}
                          disabled={repoStatus === "creating"}
                        >
                          {repoStatus === "creating" ? <span className="spinner" /> : null}
                          레포 생성
                        </button>
                      </>
                    )}
                  </div>
                  {repoMsg && (
                    <div className="hint" style={{ marginTop: 4 }}>
                      {repoMsg}
                    </div>
                  )}
                </div>
              )}

              <button
                className="wide"
                style={{ marginTop: 12 }}
                onClick={() => commit(false)}
                disabled={!canCommit || committing}
              >
                {committing ? <span className="spinner" /> : null}
                GitHub에 기록하기
              </button>
              {!draftReady && (
                <div className="hint">제목 · 문제 번호 · 최종 답안 코드를 먼저 채워주세요.</div>
              )}
              {draftReady && !user && (
                <div className="hint">GitHub 로그인 후 기록할 수 있습니다.</div>
              )}
              {draftReady && user && (!owner.trim() || !repo.trim()) && (
                <div className="hint">커밋할 owner/repo 를 입력하세요.</div>
              )}

              {commitError && (
                <div className="error" style={{ marginTop: 10 }}>
                  {commitError}
                  {needOverwrite && (
                    <div style={{ marginTop: 8 }}>
                      <button className="ghost small" onClick={() => commit(true)} disabled={committing}>
                        덮어쓰기
                      </button>
                    </div>
                  )}
                </div>
              )}

              {commitResult && (
                <div className="card" style={{ marginTop: 14, borderColor: "var(--green)" }}>
                  <div className="ok" style={{ fontWeight: 600, marginBottom: 8 }}>
                    ✓ 커밋 완료 ({commitResult.readme.action === "updated" ? "갱신" : "생성"})
                  </div>
                  <ul style={{ fontSize: 12, paddingLeft: 18, margin: "4px 0" }}>
                    <li>
                      <a href={commitResult.readme.htmlUrl} target="_blank" rel="noreferrer">
                        {artifact.filePath}
                      </a>
                    </li>
                    <li>
                      <a href={commitResult.index.htmlUrl} target="_blank" rel="noreferrer">
                        INDEX.md
                      </a>{" "}
                      갱신
                    </li>
                    <li>
                      <a href={commitResult.repoUrl} target="_blank" rel="noreferrer">
                        레포에서 보기 →
                      </a>
                    </li>
                  </ul>
                </div>
              )}

              <button className="ghost small" onClick={download} style={{ marginTop: 10 }}>
                ⬇ README.md 다운로드
              </button>
            </div>
          </section>
        </div>
      </div>
      )}
    </div>
  );
}
