"use client";

import { useCallback, useEffect, useState } from "react";
import type { IndexRow, DashboardStats } from "@/lib/dashboard";

interface Props {
  owner: string;
  repo: string;
  branch: string;
  loggedIn: boolean;
}

interface DashboardData {
  hasIndex: boolean;
  rows: IndexRow[];
  stats: DashboardStats;
}

const LEVEL_ORDER = ["lv1", "lv2", "lv3", "lv4", "lv5"];

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

/** 최근 26주치 잔디 셀(일요일 시작, 시간순) */
function buildGrass(byDate: Record<string, number>): { iso: string; count: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (7 * 26 - 1));
  // 직전 일요일로 정렬
  start.setDate(start.getDate() - start.getDay());

  const cells: { iso: string; count: number }[] = [];
  const cur = new Date(start);
  while (cur <= today) {
    const iso = isoLocal(cur);
    cells.push({ iso, count: byDate[iso] || 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

function grassLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export default function Dashboard({ owner, repo, branch, loggedIn }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!owner.trim() || !repo.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: owner.trim(), repo: repo.trim(), branch }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "조회 실패");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [owner, repo, branch]);

  useEffect(() => {
    if (loggedIn && owner.trim() && repo.trim()) load();
  }, [loggedIn, owner, repo, branch, load]);

  if (!loggedIn) {
    return <div className="hint">GitHub 로그인 후 내 기록을 볼 수 있어요.</div>;
  }
  if (!owner.trim() || !repo.trim()) {
    return <div className="hint">먼저 owner/repo 를 입력하면 그 레포의 기록을 보여줄게요.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 15 }}>
          📊 {owner}/{repo}
        </h2>
        <button className="ghost small" onClick={load} disabled={loading}>
          {loading ? <span className="spinner" /> : null}새로고침
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {data && !data.hasIndex && (
        <div className="hint">아직 INDEX.md 가 없어요. 첫 문제를 기록하면 여기에 통계가 쌓여요.</div>
      )}

      {data && data.hasIndex && (
        <>
          {/* 통계 카드 */}
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-num">{data.stats.total}</div>
              <div className="stat-label">총 문제</div>
            </div>
            <div className="stat">
              <div className="stat-num">🔥 {data.stats.currentStreak}</div>
              <div className="stat-label">현재 스트릭(일)</div>
            </div>
            <div className="stat">
              <div className="stat-num">🏆 {data.stats.longestStreak}</div>
              <div className="stat-label">최장 스트릭</div>
            </div>
            <div className="stat">
              <div className="stat-num">{data.stats.activeDays}</div>
              <div className="stat-label">기록한 날</div>
            </div>
          </div>

          {/* 난이도 분포 */}
          <div className="level-bar">
            {LEVEL_ORDER.filter((l) => data.stats.byLevel[l]).map((l) => (
              <span key={l} className={`level-chip ${l}`}>
                {l} · {data.stats.byLevel[l]}
              </span>
            ))}
          </div>

          {/* 잔디 */}
          <div className="grass-wrap">
            <div className="grass">
              {buildGrass(data.stats.byDate).map((c) => (
                <div
                  key={c.iso}
                  className={`grass-cell g${grassLevel(c.count)}`}
                  title={`${c.iso}: ${c.count}문제`}
                />
              ))}
            </div>
            <div className="grass-legend">
              <span>적음</span>
              {[0, 1, 2, 3, 4].map((g) => (
                <div key={g} className={`grass-cell g${g}`} />
              ))}
              <span>많음</span>
            </div>
          </div>

          {/* 문제 목록 (최신순) */}
          <div className="problem-list">
            {data.rows
              .slice()
              .reverse()
              .map((r, i) => {
                const path = r.link.replace(/^\.?\//, "");
                const href = `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
                return (
                  <a key={i} className="problem-row" href={href} target="_blank" rel="noreferrer">
                    <span className="p-date">{r.date}</span>
                    <span className={`level-chip ${r.level}`}>{r.level}</span>
                    <span className="p-title">{r.title}</span>
                  </a>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
