import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { ParsedProblem } from "./types";

/** URL 끝의 레슨 번호 추출. 예: .../lessons/42587 -> 42587 */
export function extractLessonNumber(url: string): string | null {
  const m = url.match(/lessons\/(\d+)/);
  return m ? m[1] : null;
}

/** 입력 URL이 프로그래머스 레슨 URL 형식인지 */
export function isProgrammersUrl(url: string): boolean {
  return /programmers\.co\.kr\/learn\/courses\/30\/lessons\/\d+/.test(url);
}

/** <table> 엘리먼트를 마크다운 테이블 문자열로 변환 */
function tableToMarkdown($: CheerioAPI, table: AnyNode): string {
  const rows: string[][] = [];
  $(table)
    .find("tr")
    .each((_, tr) => {
      const cells: string[] = [];
      $(tr)
        .find("th,td")
        .each((__, cell) => {
          cells.push($(cell).text().trim().replace(/\|/g, "\\|"));
        });
      if (cells.length) rows.push(cells);
    });
  if (!rows.length) return "";

  const colCount = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => {
    const c = [...r];
    while (c.length < colCount) c.push("");
    return c;
  };
  const [head, ...body] = rows;
  const lines = [
    `| ${pad(head).join(" | ")} |`,
    `| ${Array(colCount).fill("---").join(" | ")} |`,
    ...body.map((r) => `| ${pad(r).join(" | ")} |`),
  ];
  return lines.join("\n");
}

/** 한 섹션 컨테이너의 내용을 텍스트/테이블 섞인 마크다운으로 직렬화 */
function serializeSection($: CheerioAPI, root: Cheerio<AnyNode>): string {
  const parts: string[] = [];
  root.children().each((_, el) => {
    const tag = (el as Element).tagName?.toLowerCase();
    if (tag === "table") {
      parts.push(tableToMarkdown($, el));
    } else {
      const text = $(el).text().trim();
      if (text) parts.push(text);
    }
  });
  // children이 없으면(텍스트 노드만) 통째 텍스트로
  if (!parts.length) {
    const t = root.text().trim();
    if (t) parts.push(t);
  }
  return parts.join("\n\n").trim();
}

/** "코딩테스트 연습 - 프로세스 | 프로그래머스 스쿨" -> "프로세스" */
function cleanTitle(raw: string): string {
  return raw
    .replace(/^\s*코딩테스트\s*연습\s*-\s*/, "")
    .replace(/\s*\|\s*프로그래머스.*$/, "")
    .trim();
}

const SECTION_KEYS: Record<string, RegExp> = {
  description: /문제\s*설명/,
  constraints: /제한\s*(사항|조건)/,
  examples: /입출력\s*예$|입출력\s*예제/,
  examplesDescription: /입출력\s*예\s*설명/,
};

/**
 * 프로그래머스 레슨 페이지 HTML을 파싱.
 * DOM 구조 변경에 대비해 여러 셀렉터를 순차 시도하고,
 * 실패한 필드는 빈 문자열로 둔다(클라이언트가 수동입력 fallback 처리).
 */
export function parseProblemHtml(html: string, url: string): ParsedProblem {
  const $ = cheerio.load(html);
  const number = extractLessonNumber(url) ?? "";

  // --- 제목 ---
  const rawTitle =
    $(".lesson-title").first().text().trim() ||
    $("h1.title").first().text().trim() ||
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("title").text().trim() ||
    "";
  const title = cleanTitle(rawTitle);

  // --- 본문 컨테이너 후보 ---
  const container = [
    ".markdown",
    ".guide-section-description",
    ".lesson-content",
    "#tour",
    ".algorithm-content",
  ]
    .map((sel) => $(sel).first())
    .find((c) => c.length > 0);

  const result: ParsedProblem = {
    number,
    title,
    url,
    level: null,
    description: "",
    constraints: "",
    examples: "",
    examplesDescription: "",
  };

  if (!container || container.length === 0) {
    return result;
  }

  // 헤딩(h1~h6, b, strong) 기준으로 섹션을 나눈다.
  const headings = container.find("h1,h2,h3,h4,h5,h6").toArray();
  if (headings.length) {
    // 프로그래머스는 "문제 설명"이 보통 첫 헤딩 없이 본문 맨 앞에 온다.
    // 첫 헤딩 이전의 노드들을 description 으로 수집.
    const firstHeading = headings[0];
    const lead = cheerio.load("<div></div>");
    const leadWrap = lead("div");
    container.children().each((_, el) => {
      if (el === firstHeading) return false; // 첫 헤딩 만나면 중단
      // 헤딩 자신은 건너뜀(혹시 첫 자식이 헤딩이 아닌 경우 대비)
      const tag = (el as Element).tagName?.toLowerCase();
      if (tag && /^h[1-6]$/.test(tag)) return false;
      leadWrap.append(lead(el).clone());
      return undefined;
    });
    const leadText = serializeSection(lead, leadWrap);
    if (leadText) result.description = leadText;

    headings.forEach((h, i) => {
      const headText = $(h).text().trim();
      const key = (Object.keys(SECTION_KEYS) as (keyof typeof SECTION_KEYS)[]).find(
        (k) => SECTION_KEYS[k].test(headText)
      );
      if (!key) return;

      // 이 헤딩 다음부터 다음 헤딩 전까지의 형제 노드 수집
      const buf = cheerio.load("<div></div>");
      const wrap = buf("div");
      let node = $(h).next();
      const nextHeading = headings[i + 1];
      while (node.length && node.get(0) !== nextHeading) {
        wrap.append(node.clone());
        node = node.next();
      }
      (result as unknown as Record<string, string>)[key] = serializeSection(buf, wrap);
    });
  } else {
    // 헤딩이 전혀 없으면 전체를 설명으로
    result.description = serializeSection($, container);
  }

  return result;
}

/** 서버에서 프로그래머스 페이지를 가져와 파싱 */
export async function fetchAndParse(url: string): Promise<ParsedProblem> {
  const res = await fetch(url, {
    headers: {
      // 일부 페이지가 UA 없으면 막음
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    // rate limit 보호: 캐시 비활성
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`프로그래머스 응답 오류: ${res.status}`);
  }
  const html = await res.text();
  return parseProblemHtml(html, url);
}
