import type { IndexRow } from "./dashboard";
import { CATALOG, problemUrl, type CatalogProblem } from "./catalog";

export interface Recommendation extends CatalogProblem {
  url: string;
  reason: string;
}

const LEVELS = ["lv1", "lv2", "lv3", "lv4", "lv5"];

/** INDEX 링크(./lv2/42587_프린터/README.md)에서 문제 번호 추출 */
function numberFromLink(link: string): string | null {
  const m = link.match(/\/(\d+)_/) || link.match(/(\d{3,})/);
  return m ? m[1] : null;
}

/**
 * 내 기록(rows) 기반 추천.
 * - 이미 푼 문제 제외
 * - "편한 난이도"(가장 많이/높이 푼 레벨)에서 보강 + 한 단계 위로 도전
 */
export function recommend(rows: IndexRow[], count = 4): Recommendation[] {
  const solved = new Set<string>();
  const countByLevel: Record<string, number> = {};
  for (const r of rows) {
    const n = numberFromLink(r.link);
    if (n) solved.add(n);
    countByLevel[r.level] = (countByLevel[r.level] || 0) + 1;
  }

  // 편한 난이도 = 푼 적 있는 가장 높은 레벨 (없으면 lv1)
  let comfortIdx = 0;
  LEVELS.forEach((l, i) => {
    if ((countByLevel[l] || 0) > 0) comfortIdx = i;
  });
  // 그 레벨을 5문제 이상 풀었으면 한 단계 위를 타깃으로
  let targetIdx = comfortIdx;
  if ((countByLevel[LEVELS[comfortIdx]] || 0) >= 5 && comfortIdx < LEVELS.length - 1) {
    targetIdx = comfortIdx + 1;
  }

  const isNew = rows.length === 0;
  const unsolvedAt = (level: string) =>
    CATALOG.filter((p) => p.level === level && !solved.has(p.number));

  // 우선순위: 타깃 레벨 → 한 단계 위(도전) → 한 단계 아래(복습)
  const order = [
    LEVELS[targetIdx],
    LEVELS[targetIdx + 1],
    LEVELS[targetIdx - 1],
  ].filter(Boolean) as string[];

  const picked: Recommendation[] = [];
  const seen = new Set<string>();

  for (const level of order) {
    for (const p of unsolvedAt(level)) {
      if (picked.length >= count) break;
      if (seen.has(p.number)) continue;
      seen.add(p.number);

      let reason: string;
      if (isNew) {
        reason = "여기서 시작해보세요 👍";
      } else if (LEVELS.indexOf(level) > comfortIdx) {
        reason = `${LEVELS[comfortIdx]}를 충분히 풀었어요 — ${level} 도전!`;
      } else if (LEVELS.indexOf(level) < comfortIdx) {
        reason = "기초 다지기 좋은 문제예요";
      } else {
        reason = `아직 안 푼 ${level} 인기 문제`;
      }

      picked.push({ ...p, url: problemUrl(p.number), reason });
    }
    if (picked.length >= count) break;
  }

  return picked.slice(0, count);
}
