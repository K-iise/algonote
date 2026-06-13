/**
 * INDEX.md 를 데이터 소스로 하는 대시보드/스트릭 계산 (순수 함수).
 * 별도 커밋히스토리 API 없이 INDEX 의 날짜만으로 통계를 낸다.
 */

export interface IndexRow {
  date: string; // 원본 표기 (예: 2026.06.13)
  level: string; // lv1..lv5
  title: string;
  link: string; // ./lv2/42587_프린터/README.md
}

export interface DashboardStats {
  total: number;
  byLevel: Record<string, number>;
  byDate: Record<string, number>; // ISO(YYYY-MM-DD) -> 건수
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
}

/** INDEX.md 본문 → 표 행 파싱 (헤더/구분선 제외) */
export function parseIndex(content: string): IndexRow[] {
  const rows: IndexRow[] = [];
  for (const line of content.split("\n")) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 4) continue;
    if (/날짜/.test(cells[0]) || /^:?-{2,}:?$/.test(cells[0])) continue; // 헤더/구분선
    const [date, level, title, linkCell] = cells;
    const m = linkCell.match(/\(([^)]+)\)/);
    rows.push({ date, level, title, link: m ? m[1] : "" });
  }
  return rows;
}

/** "2026.06.13" | "2026-6-3" → "2026-06-13" (실패 시 null) */
export function toISODate(raw: string): string | null {
  const m = raw.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** ISO 날짜 → epoch 기준 일수 (UTC) */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function computeStats(rows: IndexRow[], todayIso?: string): DashboardStats {
  const byLevel: Record<string, number> = {};
  const byDate: Record<string, number> = {};

  for (const r of rows) {
    byLevel[r.level] = (byLevel[r.level] || 0) + 1;
    const iso = toISODate(r.date);
    if (iso) byDate[iso] = (byDate[iso] || 0) + 1;
  }

  const dayNums = Object.keys(byDate).map(dayNumber).sort((a, b) => a - b);
  const daySet = new Set(dayNums);

  // 최장 스트릭
  let longest = 0;
  let cur = 0;
  let prev: number | null = null;
  for (const n of dayNums) {
    cur = prev !== null && n === prev + 1 ? cur + 1 : 1;
    longest = Math.max(longest, cur);
    prev = n;
  }

  // 현재 스트릭 (오늘 또는 어제까지 이어지면 인정)
  const today = dayNumber(todayIso || new Date().toISOString().slice(0, 10));
  let cursor = daySet.has(today) ? today : today - 1;
  let current = 0;
  while (daySet.has(cursor)) {
    current++;
    cursor--;
  }

  return {
    total: rows.length,
    byLevel,
    byDate,
    currentStreak: current,
    longestStreak: longest,
    activeDays: dayNums.length,
  };
}
