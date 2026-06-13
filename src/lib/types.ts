export type Level = "lv1" | "lv2" | "lv3" | "lv4" | "lv5";

/** 프로그래머스에서 파싱(혹은 수동입력)되는 문제 원본 정보 */
export interface ParsedProblem {
  /** 레슨 번호. 예: 42587 */
  number: string;
  /** 문제 제목. 예: 프린터 */
  title: string;
  /** 원본 URL */
  url: string;
  /** 난이도 (파싱이 안 되면 사용자가 지정) */
  level: Level | null;
  /** 문제 설명 (마크다운/텍스트) */
  description: string;
  /** 제한사항 */
  constraints: string;
  /** 입출력 예 (마크다운 테이블 등) */
  examples: string;
  /** 입출력 예 설명 */
  examplesDescription: string;
}

/** 사용자가 에디터에서 직접 작성하는 풀이 내용 */
export interface SolutionDraft {
  level: Level;
  date: string; // YYYY.MM.DD
  firstCode: string;
  mistake: string;
  finalCode: string;
  learned: string;
  approach: string;
  aiHint: string;
}

/** 커밋 미리보기에 필요한 산출물 */
export interface CommitArtifact {
  filePath: string; // 예: lv2/42587_프린터/README.md
  commitMessage: string; // 예: [lv2] 프린터 풀이 기록 - 2026.06.13
  readme: string; // README.md 전체 내용
  indexRow: string; // INDEX.md 에 추가될 한 줄
}
