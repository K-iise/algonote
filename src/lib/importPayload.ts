/**
 * 확장프로그램 → 웹앱 핸드오프 페이로드.
 * 확장이 프로그래머스 페이지에서 캡처한 내용을 base64(UTF-8 JSON)로 인코딩해
 * 웹앱 URL 의 `#import=...` 해시로 전달한다.
 */
export interface ImportPayload {
  url: string;
  number: string;
  title: string;
  level: string | null; // "lv1".."lv5" | null
  description: string;
  constraints: string;
  examples: string;
  examplesDescription: string;
  finalCode: string; // 캡처된 정답 코드(없으면 "")
}

/** UTF-8 안전 base64 인코딩 (브라우저/확장 공용) */
export function encodeImport(p: ImportPayload): string {
  const json = JSON.stringify(p);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/** `#import=` 해시 값 → 페이로드. 실패 시 null */
export function decodeImport(b64: string): ImportPayload | null {
  try {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const obj = JSON.parse(json) as ImportPayload;
    if (typeof obj !== "object" || obj === null) return null;
    return obj;
  } catch {
    return null;
  }
}
