// AlgoNote Capture — 프로그래머스 문제/정답코드 캡처 → AlgoNote 웹앱으로 핸드오프
(function () {
  "use strict";

  // ---------- 페이지 컨텍스트 스크립트 주입 (에디터 코드 읽기용) ----------
  function injectPageScript() {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("inject.js");
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  }

  // ---------- 문제 파싱 (lib/parser.ts 의 DOM 버전) ----------
  function cleanTitle(raw) {
    return (raw || "")
      .replace(/^\s*코딩테스트\s*연습\s*-\s*/, "")
      .replace(/\s*\|\s*프로그래머스.*$/, "")
      .trim();
  }

  function tableToMarkdown(table) {
    const rows = [];
    table.querySelectorAll("tr").forEach((tr) => {
      const cells = [];
      tr.querySelectorAll("th,td").forEach((c) => {
        cells.push(c.innerText.trim().replace(/\|/g, "\\|"));
      });
      if (cells.length) rows.push(cells);
    });
    if (!rows.length) return "";
    const cols = Math.max.apply(null, rows.map((r) => r.length));
    const pad = (r) => {
      const c = r.slice();
      while (c.length < cols) c.push("");
      return c;
    };
    const head = pad(rows[0]);
    const sep = new Array(cols).fill("---");
    const lines = ["| " + head.join(" | ") + " |", "| " + sep.join(" | ") + " |"];
    rows.slice(1).forEach((r) => lines.push("| " + pad(r).join(" | ") + " |"));
    return lines.join("\n");
  }

  function serializeEls(els) {
    const parts = [];
    els.forEach((el) => {
      if (el.tagName === "TABLE") {
        const t = tableToMarkdown(el);
        if (t) parts.push(t);
      } else {
        const t = (el.innerText || "").trim();
        if (t) parts.push(t);
      }
    });
    return parts.join("\n\n").trim();
  }

  function getContainer() {
    const sels = [
      ".markdown",
      ".guide-section-description",
      ".lesson-content",
      "#tour",
      ".algorithm-content",
    ];
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function matchKey(t) {
    if (/문제\s*설명/.test(t)) return "description";
    if (/제한\s*(사항|조건)/.test(t)) return "constraints";
    if (/입출력\s*예\s*설명/.test(t)) return "examplesDescription";
    if (/입출력\s*예/.test(t)) return "examples";
    return null;
  }

  function scrapeProblem() {
    const url = location.href.split("#")[0].split("?")[0];
    const number = (url.match(/lessons\/(\d+)/) || [])[1] || "";

    const titleEl = document.querySelector(".lesson-title");
    let title = titleEl ? titleEl.innerText.trim() : "";
    if (!title) title = cleanTitle(document.title);
    title = cleanTitle(title);

    // 난이도: 헤더 근처의 "Lv. N"
    let level = null;
    const header =
      document.querySelector(".lesson-title") ||
      document.querySelector("header") ||
      document.body;
    const lvm = (header.innerText || "").match(/Lv\.?\s*([1-5])/);
    if (lvm) level = "lv" + lvm[1];

    const result = {
      description: "",
      constraints: "",
      examples: "",
      examplesDescription: "",
    };

    const container = getContainer();
    if (container) {
      const headings = Array.prototype.slice.call(
        container.querySelectorAll("h1,h2,h3,h4,h5,h6")
      );
      if (headings.length) {
        // 첫 헤딩 이전(문제 설명 본문) 수집
        const lead = [];
        const children = Array.prototype.slice.call(container.children);
        for (const child of children) {
          if (child === headings[0] || child.contains(headings[0])) break;
          if (/^H[1-6]$/.test(child.tagName)) break;
          lead.push(child);
        }
        const leadText = serializeEls(lead);
        if (leadText) result.description = leadText;

        headings.forEach((h, i) => {
          const key = matchKey((h.innerText || "").trim());
          if (!key) return;
          const buf = [];
          let node = h.nextElementSibling;
          const next = headings[i + 1];
          while (node && node !== next) {
            buf.push(node);
            node = node.nextElementSibling;
          }
          result[key] = serializeEls(buf);
        });
      } else {
        result.description = serializeEls(Array.prototype.slice.call(container.children));
      }
    }

    return {
      url: url,
      number: number,
      title: title,
      level: level,
      description: result.description,
      constraints: result.constraints,
      examples: result.examples,
      examplesDescription: result.examplesDescription,
      finalCode: "",
    };
  }

  // ---------- 코드 요청 (inject.js 와 postMessage) ----------
  function requestCode(timeoutMs) {
    return new Promise((resolve) => {
      let done = false;
      function onMsg(ev) {
        if (ev.source !== window) return;
        const d = ev.data;
        if (!d || d.source !== "algonote-inject" || d.type !== "CODE") return;
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        resolve(d.code || "");
      }
      window.addEventListener("message", onMsg);
      window.postMessage({ source: "algonote", type: "GET_CODE" }, "*");
      setTimeout(() => {
        if (done) return;
        done = true;
        window.removeEventListener("message", onMsg);
        resolve("");
      }, timeoutMs || 800);
    });
  }

  // ---------- 핸드오프 ----------
  function encodeImport(p) {
    const bytes = new TextEncoder().encode(JSON.stringify(p));
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  }

  function getAppUrl() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get({ appUrl: "http://localhost:3000" }, (cfg) => {
          resolve((cfg && cfg.appUrl) || "http://localhost:3000");
        });
      } catch (e) {
        resolve("http://localhost:3000");
      }
    });
  }

  async function capture(btn) {
    const original = btn.textContent;
    btn.textContent = "⏳ 캡처 중...";
    btn.disabled = true;
    try {
      const payload = scrapeProblem();
      payload.finalCode = await requestCode(900);
      const appUrl = await getAppUrl();
      const target = appUrl.replace(/\/$/, "") + "/#import=" + encodeImport(payload);
      window.open(target, "_blank", "noopener");
      btn.textContent = "✓ 보냈어요";
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 2000);
    } catch (e) {
      console.error("[AlgoNote] capture 실패", e);
      btn.textContent = "⚠ 실패 (콘솔 확인)";
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 2500);
    }
  }

  // ---------- 플로팅 버튼 ----------
  function mountButton() {
    if (document.getElementById("algonote-capture-btn")) return;
    const btn = document.createElement("button");
    btn.id = "algonote-capture-btn";
    btn.textContent = "📝 AlgoNote에 보내기";
    Object.assign(btn.style, {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      zIndex: "2147483647",
      padding: "11px 16px",
      background: "#3d7bf6",
      color: "#fff",
      border: "none",
      borderRadius: "999px",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
      fontFamily: "-apple-system, sans-serif",
    });
    btn.addEventListener("click", () => capture(btn));
    document.body.appendChild(btn);
  }

  injectPageScript();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountButton);
  } else {
    mountButton();
  }
})();
