/**
 * 추천용 프로그래머스 인기 문제 카탈로그 (수작업 큐레이션).
 * 가짜 문제번호 생성을 막기 위해 잘 알려진 문제만 고정 목록으로 둔다.
 */
export interface CatalogProblem {
  number: string;
  title: string;
  level: string; // lv1..lv3
  tag: string; // 대표 유형
}

export const CATALOG: CatalogProblem[] = [
  // lv1
  { number: "42576", title: "완주하지 못한 선수", level: "lv1", tag: "해시" },
  { number: "42840", title: "모의고사", level: "lv1", tag: "완전탐색" },
  { number: "42862", title: "체육복", level: "lv1", tag: "그리디" },
  { number: "42748", title: "K번째수", level: "lv1", tag: "정렬" },
  { number: "12906", title: "같은 숫자는 싫어", level: "lv1", tag: "스택" },
  { number: "68644", title: "두 개 뽑아서 더하기", level: "lv1", tag: "구현" },
  { number: "12982", title: "예산", level: "lv1", tag: "그리디" },
  { number: "67256", title: "키패드 누르기", level: "lv1", tag: "구현" },
  { number: "86051", title: "없는 숫자 더하기", level: "lv1", tag: "구현" },
  { number: "132267", title: "콜라 문제", level: "lv1", tag: "수학" },

  // lv2
  { number: "42586", title: "기능개발", level: "lv2", tag: "스택/큐" },
  { number: "42587", title: "프린터", level: "lv2", tag: "큐" },
  { number: "42583", title: "다리를 지나는 트럭", level: "lv2", tag: "큐" },
  { number: "42584", title: "주식가격", level: "lv2", tag: "스택" },
  { number: "42842", title: "카펫", level: "lv2", tag: "완전탐색" },
  { number: "43165", title: "타겟 넘버", level: "lv2", tag: "DFS/BFS" },
  { number: "42626", title: "더 맵게", level: "lv2", tag: "힙" },
  { number: "12909", title: "올바른 괄호", level: "lv2", tag: "스택" },
  { number: "17680", title: "[1차] 캐시", level: "lv2", tag: "구현" },
  { number: "12973", title: "짝지어 제거하기", level: "lv2", tag: "스택" },
  { number: "42747", title: "H-Index", level: "lv2", tag: "정렬" },
  { number: "87946", title: "피로도", level: "lv2", tag: "완전탐색" },
  { number: "42746", title: "가장 큰 수", level: "lv2", tag: "정렬" },
  { number: "42577", title: "전화번호 목록", level: "lv2", tag: "해시" },

  // lv3
  { number: "43162", title: "네트워크", level: "lv3", tag: "DFS/BFS" },
  { number: "43163", title: "단어 변환", level: "lv3", tag: "BFS" },
  { number: "43105", title: "정수 삼각형", level: "lv3", tag: "DP" },
  { number: "49189", title: "가장 먼 노드", level: "lv3", tag: "BFS" },
  { number: "42579", title: "베스트앨범", level: "lv3", tag: "해시/정렬" },
  { number: "42627", title: "디스크 컨트롤러", level: "lv3", tag: "힙" },
  { number: "42628", title: "이중우선순위큐", level: "lv3", tag: "힙" },
  { number: "43238", title: "입국심사", level: "lv3", tag: "이분탐색" },
  { number: "43164", title: "여행경로", level: "lv3", tag: "DFS" },
  { number: "67259", title: "경주로 건설", level: "lv3", tag: "BFS/DP" },
];

export function problemUrl(number: string): string {
  return `https://school.programmers.co.kr/learn/courses/30/lessons/${number}`;
}
