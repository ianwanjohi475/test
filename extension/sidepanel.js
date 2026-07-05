// Side-panel controller: scans the active tab for URLs, renders them live, and
// fetches individual (or all) URLs via the background service worker to show
// each HTTP response. Persists across tab switches and can auto-rescan.

let allUrls = []; // [{ url, kinds, text }]
const responseCache = new Map(); // url -> response object from background
let statusFilter = "all";
let currentTabId = null;
let scanning = false;

const listEl = document.getElementById("list");
const summaryEl = document.getElementById("summary");
const filterEl = document.getElementById("filter");
const methodEl = document.getElementById("method");
const autoEl = document.getElementById("auto");
const pageEl = document.getElementById("page");
const detailEl = document.getElementById("detail");
const detailBodyEl = document.getElementById("detail-body");
const detailUrlEl = document.getElementById("detail-url");
const detailOpenEl = document.getElementById("detail-open");

document.getElementById("rescan").addEventListener("click", scan);
document.getElementById("fetchall").addEventListener("click", fetchAll);
document.getElementById("copy").addEventListener("click", copyVisible);
document.getElementById("export").addEventListener("click", exportJson);
document.getElementById("detail-back").addEventListener("click", () => detailEl.classList.add("hidden"));
filterEl.addEventListener("input", render);

document.getElementById("statusFilters").addEventListener("click", (e) => {
  const btn = e.target.closest(".pill");
  if (!btn) return;
  statusFilter = btn.dataset.f;
  document.querySelectorAll("#statusFilters .pill").forEach((p) => p.classList.toggle("active", p === btn));
  render();
});

// Re-scan when the user switches tabs or the page navigates (if Auto is on).
chrome.tabs.onActivated.addListener(() => autoEl.checked && scan());
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (autoEl.checked && info.status === "complete" && tabId === currentTabId) scan();
});

init();

async function init() {
  await scan();
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function scan() {
  if (scanning) return;
  scanning = true;
  detailEl.classList.add("hidden");
  listEl.innerHTML = `<div class="empty">Scanning page…</div>`;
  summaryEl.textContent = "";
  try {
    const tab = await getActiveTab();
    currentTabId = tab ? tab.id : null;
    pageEl.textContent = tab ? tab.url || "" : "";
    if (!tab || !tab.id || !/^https?:/i.test(tab.url || "")) {
      listEl.innerHTML = `<div class="empty">This page can't be scanned.<br>Open a normal http(s) website.</div>`;
      return;
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files: ["content.js"],
    });
    allUrls = (results && results[0] && results[0].result) || [];
    responseCache.clear();
    render();
  } catch (err) {
    listEl.innerHTML = `<div class="empty">Could not scan this page.<br><small>${escapeHtml(String(err.message || err))}</small></div>`;
  } finally {
    scanning = false;
  }
}

function statusClass(res) {
  if (!res) return null;
  if (!res.ok) return "err";
  if (res.status >= 500) return "server";
  if (res.status >= 400) return "client";
  if (res.status >= 300 || res.redirected) return "redir";
  return "ok";
}

function matchesStatusFilter(item) {
  if (statusFilter === "all") return true;
  const res = responseCache.get(item.url);
  const cls = statusClass(res);
  if (statusFilter === "err") return cls === "err";
  if (statusFilter === "ok") return cls === "ok";
  if (statusFilter === "redir") return cls === "redir";
  if (statusFilter === "client") return cls === "client";
  if (statusFilter === "server") return cls === "server";
  return true;
}

function visibleUrls() {
  const q = filterEl.value.trim().toLowerCase();
  return allUrls.filter((u) => {
    if (q && !(u.url.toLowerCase().includes(q) || (u.text || "").toLowerCase().includes(q))) return false;
    return matchesStatusFilter(u);
  });
}

function render() {
  const urls = visibleUrls();
  const fetched = allUrls.filter((u) => responseCache.has(u.url)).length;
  summaryEl.textContent = `Showing ${urls.length} of ${allUrls.length} URL${allUrls.length === 1 ? "" : "s"}` +
    (fetched ? ` · ${fetched} fetched` : "");
  if (!urls.length) {
    listEl.innerHTML = `<div class="empty">${allUrls.length ? "No URLs match." : "No URLs found on this page."}</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  for (const item of urls) frag.appendChild(renderRow(item));
  listEl.innerHTML = "";
  listEl.appendChild(frag);
}

function renderRow(item) {
  const row = document.createElement("div");
  row.className = "row";

  const url = document.createElement("div");
  url.className = "url";
  url.textContent = item.url;
  url.title = "Click to fetch and view the response";
  url.addEventListener("click", () => showDetail(item.url));
  row.appendChild(url);

  const sub = document.createElement("div");
  sub.className = "sub";
  for (const kind of item.kinds) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = kind;
    sub.appendChild(chip);
  }

  const cached = responseCache.get(item.url);
  if (cached) sub.appendChild(statusBadge(cached));

  const actions = document.createElement("div");
  actions.className = "row-actions";

  const fetchBtn = document.createElement("button");
  fetchBtn.textContent = cached ? "View" : "Fetch";
  fetchBtn.addEventListener("click", () => showDetail(item.url));
  actions.appendChild(fetchBtn);

  const openBtn = document.createElement("button");
  openBtn.textContent = "↗";
  openBtn.title = "Open in a new tab";
  openBtn.addEventListener("click", () => chrome.tabs.create({ url: item.url, active: false }));
  actions.appendChild(openBtn);

  sub.appendChild(actions);
  row.appendChild(sub);
  return row;
}

function statusBadge(res) {
  const span = document.createElement("span");
  span.className = "status";
  if (!res.ok) {
    span.classList.add("err");
    span.textContent = "FAIL";
  } else {
    const cls = statusClass(res);
    span.classList.add(cls === "ok" ? "ok" : cls === "redir" ? "redir" : "err");
    span.textContent = String(res.status);
  }
  span.title = `${res.method} · ${res.elapsedMs} ms`;
  return span;
}

async function doFetch(url) {
  const res = await chrome.runtime.sendMessage({ type: "fetchUrl", url, method: methodEl.value });
  responseCache.set(url, res);
  return res;
}

async function showDetail(url) {
  detailEl.classList.remove("hidden");
  detailUrlEl.textContent = url;
  detailOpenEl.onclick = () => chrome.tabs.create({ url, active: true });
  detailBodyEl.innerHTML = `<div class="empty">Fetching…</div>`;

  let res = responseCache.get(url);
  if (!res) {
    res = await doFetch(url);
    render();
  }
  renderDetail(res);
}

async function fetchAll() {
  const urls = visibleUrls().map((u) => u.url).filter((u) => !responseCache.has(u));
  if (!urls.length) {
    flashSummary("Nothing new to fetch");
    return;
  }
  let done = 0;
  const CONCURRENCY = 6;
  let i = 0;
  async function worker() {
    while (i < urls.length) {
      const url = urls[i++];
      await doFetch(url);
      done++;
      summaryEl.textContent = `Fetching… ${done}/${urls.length}`;
      render();
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  render();
  flashSummary(`Fetched ${done} URL${done === 1 ? "" : "s"}`);
}

function renderDetail(res) {
  if (!res) {
    detailBodyEl.innerHTML = `<div class="empty">No response.</div>`;
    return;
  }
  if (!res.ok && res.error) {
    detailBodyEl.innerHTML = `
      <h2>Request failed</h2>
      <pre>${escapeHtml(res.error)}</pre>
      <div class="kv"><div class="k">Method</div><div class="v">${escapeHtml(res.method)}</div>
      <div class="k">Time</div><div class="v">${res.elapsedMs} ms</div></div>`;
    return;
  }
  const headerRows = Object.entries(res.headers || {})
    .map(([k, v]) => `<div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div>`)
    .join("");

  detailBodyEl.innerHTML = `
    <h2>Status</h2>
    <div class="kv">
      <div class="k">Method</div><div class="v">${escapeHtml(res.method)}</div>
      <div class="k">Status</div><div class="v">${res.status} ${escapeHtml(res.statusText || "")}</div>
      <div class="k">Final URL</div><div class="v">${escapeHtml(res.finalUrl || "")}</div>
      <div class="k">Redirected</div><div class="v">${res.redirected ? "yes" : "no"}</div>
      <div class="k">Content-Type</div><div class="v">${escapeHtml(res.contentType || "")}</div>
      <div class="k">Time</div><div class="v">${res.elapsedMs} ms</div>
    </div>
    <h2>Response headers</h2>
    <div class="kv">${headerRows || '<div class="v">(none)</div>'}</div>
    <h2>Body${res.bodyTruncated ? " (truncated)" : ""}</h2>
    <pre>${escapeHtml(res.body || "")}</pre>`;
}

async function copyVisible() {
  const text = visibleUrls().map((u) => u.url).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    flashSummary(`Copied ${visibleUrls().length} URLs`);
  } catch (e) {
    flashSummary("Copy failed");
  }
}

function exportJson() {
  const data = visibleUrls().map((u) => {
    const res = responseCache.get(u.url);
    return {
      url: u.url,
      kinds: u.kinds,
      status: res ? (res.ok ? res.status : "failed") : null,
      contentType: res && res.ok ? res.contentType : null,
    };
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "urls.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  flashSummary(`Exported ${data.length} URLs`);
}

let flashTimer;
function flashSummary(msg) {
  clearTimeout(flashTimer);
  summaryEl.textContent = msg;
  flashTimer = setTimeout(render, 1600);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
