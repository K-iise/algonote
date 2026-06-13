import type { Level } from "./types";

/** 파일/폴더 이름에 못 쓰는 문자를 안전하게 치환. 한글/영문/숫자는 보존 */
export function slugify(title: string): string {
  return title
    .trim()
    .replace(/[\\/:*?"<>|]/g, "") // OS 금지 문자 제거
    .replace(/\s+/g, "_"); // 공백 -> 언더스코어
}

/**
 * 레포 내 README 경로 생성 규칙.
 *   /{난이도}/{문제번호}_{문제제목}/README.md
 */
export function buildFilePath(level: Level, number: string, title: string): string {
  return `${level}/${number}_${slugify(title)}/README.md`;
}

/** 커밋 메시지: [lv2] 프린터 풀이 기록 - 2026.06.13 */
export function buildCommitMessage(level: Level, title: string, date: string): string {
  return `[${level}] ${title} 풀이 기록 - ${date}`;
}

/** INDEX.md 한 줄: | 2026.06.13 | lv2 | 프린터 | [바로가기](./lv2/42587_프린터/README.md) | */
export function buildIndexRow(
  level: Level,
  number: string,
  title: string,
  date: string
): string {
  const path = buildFilePath(level, number, title);
  return `| ${date} | ${level} | ${title} | [바로가기](./${path}) |`;
}

/** 오늘 날짜를 YYYY.MM.DD 로 */
export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
