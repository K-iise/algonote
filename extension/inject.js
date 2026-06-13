// 페이지 컨텍스트에서 실행 — 에디터(Ace/CodeMirror)의 전체 코드를 읽어
// content script 로 postMessage 한다. (content script 는 page window 변수 접근 불가)
(function () {
  function readCode() {
    // 1) Ace 에디터 (프로그래머스 기본)
    try {
      if (window.ace && typeof window.ace.edit === "function") {
        const el = document.querySelector(".ace_editor");
        if (el) {
          const editor = window.ace.edit(el);
          const v = editor.getValue();
          if (v && v.trim()) return v;
        }
      }
    } catch (e) {
      /* noop */
    }

    // 2) CodeMirror 5 (el.CodeMirror 인스턴스)
    try {
      const cm5 = document.querySelector(".CodeMirror");
      if (cm5 && cm5.CodeMirror) {
        const v = cm5.CodeMirror.getValue();
        if (v && v.trim()) return v;
      }
    } catch (e) {
      /* noop */
    }

    // 3) CodeMirror 6 (.cm-content 의 view) — 가능하면 cmView 사용
    try {
      const cm6 = document.querySelector(".cm-content");
      if (cm6 && cm6.cmView && cm6.cmView.view) {
        const v = cm6.cmView.view.state.doc.toString();
        if (v && v.trim()) return v;
      }
    } catch (e) {
      /* noop */
    }

    // 4) 폴백: textarea
    try {
      const ta = document.querySelector("textarea.ace_text-input, textarea#code, textarea");
      if (ta && ta.value && ta.value.trim()) return ta.value;
    } catch (e) {
      /* noop */
    }

    return "";
  }

  window.addEventListener("message", function (ev) {
    if (ev.source !== window) return;
    const d = ev.data;
    if (!d || d.source !== "algonote" || d.type !== "GET_CODE") return;
    const code = readCode();
    window.postMessage({ source: "algonote-inject", type: "CODE", code: code }, "*");
  });
})();
