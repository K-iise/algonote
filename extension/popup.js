const DEFAULT_URL = "http://localhost:3000";
const input = document.getElementById("appUrl");
const saved = document.getElementById("saved");

chrome.storage.sync.get({ appUrl: DEFAULT_URL }, (cfg) => {
  input.value = cfg.appUrl || DEFAULT_URL;
});

document.getElementById("save").addEventListener("click", () => {
  let url = input.value.trim() || DEFAULT_URL;
  url = url.replace(/\/$/, "");
  chrome.storage.sync.set({ appUrl: url }, () => {
    saved.textContent = "✓ 저장됨";
    setTimeout(() => (saved.textContent = ""), 1500);
  });
});
