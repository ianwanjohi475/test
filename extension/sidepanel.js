// Side-panel controller: scans the active tab for every URL (DOM + loaded
// network resources), renders them live, and fetches individual (or all) URLs
// via the background service worker — showing each URL together with its
// HTTP response inline in the list.

let allUrls = []; // [{ url, kinds, text }]
const responseCache = new Map(); // url -> response object from background
const expanded = new Set(); // urls whose full detail is expanded inline
let statusFilter = "all";
let currentTabId = null;
let scanning = false;

const listEl = document.getElementById("list");
const summaryEl = document.getElementById("summary");
const filterEl = document.getElementById("filter");
const methodEl = document.getElementById("method");
const autoEl = document.getElementById("auto");
const pageEl = document.getElementById("page");

document.getElementById("rescan").addEventListener("click", scan);
document.getElementById("fetchall").addEventListener("click", fetchAll);
document.getElementById("copy").addEventListener("click", copyVisible);
document.getElementById("export").addEventListener("click", exportJson);
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
    expanded.clear();
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
  const cls = statusClass(responseCache.get(item.url));
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
  const res = responseCache.get(item.url);
  const row = document.createElement("div");
  row.className = "row";

  // URL (click = fetch if not fetched, else toggle full detail).
  const url = document.createElement("div");
  url.className = "url";
  url.textContent = item.url;
  url.title = res ? "Click to expand/collapse the full response" : "Click to fetch this URL";
  url.addEventListener("click", () => onUrlClick(item.url));
  row.appendChild(url);

  // Sub line: source chips + status badge + actions.
  const sub = document.createElement("div");
  sub.className = "sub";
  for (const kind of item.kinds) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = kind;
    sub.appendChild(chip);
  }
  if (res) sub.appendChild(statusBadge(res));

  const actions = document.createElement("div");
  actions.className = "row-actions";
  const fetchBtn = document.createElement("button");
  fetchBtn.textContent = res ? "Refetch" : "Fetch";
  fetchBtn.addEventListener("click", (e) => { e.stopPropagation(); fetchOne(item.url, true); });
  actions.appendChild(fetchBtn);
  const openBtn = document.createElement("button");
  openBtn.textContent = "↗";
  openBtn.title = "Open in a new tab";
  openBtn.addEventListener("click", (e) => { e.stopPropagation(); chrome.tabs.create({ url: item.url, active: false }); });
  actions.appendChild(openBtn);
  sub.appendChild(actions);
  row.appendChild(sub);

  // Inline response — shown as soon as the URL is fetched.
  if (res) row.appendChild(renderResponse(item.url, res));
  return row;
}

function statusBadge(res) {
  const span = document.createElement("span");
  span.className = "status";
  if (res.pending) {
    span.classList.add("pending");
    span.textContent = "…";
    return span;
  }
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

// Inline response block: always shows a compact summary + body preview; a
// "Details" toggle expands full headers and the full body.
function renderResponse(url, res) {
  const box = document.createElement("div");
  box.className = "resp";

  if (res.pending) {
    box.innerHTML = `<div class="resp-line dim">Fetching…</div>`;
    return box;
  }

  if (!res.ok && res.error) {
    box.classList.add("resp-err");
    box.innerHTML = `<div class="resp-line">✖ ${escapeHtml(res.error)} <span class="dim">· ${res.method} · ${res.elapsedMs} ms</span></div>`;
    return box;
  }

  const cls = statusClass(res);
  const isExpanded = expanded.has(url);
  const bodyText = res.body || "";
  const preview = isExpanded ? bodyText : bodyText.slice(0, 300);

  const line = document.createElement("div");
  line.className = "resp-line";
  line.innerHTML =
    `<span class="status ${cls === "ok" ? "ok" : cls === "redir" ? "redir" : "err"}">${res.status} ${escapeHtml(res.statusText || "")}</span>` +
    `<span class="dim"> · ${escapeHtml(res.contentType || "?")} · ${res.method} · ${res.elapsedMs} ms${res.redirected ? " · redirected" : ""}</span>`;
  box.appendChild(line);

  if (isExpanded) {
    const headerRows = Object.entries(res.headers || {})
      .map(([k, v]) => `<div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div>`)
      .join("");
    const meta = document.createElement("div");
    meta.className = "resp-meta";
    meta.innerHTML =
      `<div class="kv"><div class="k">Final URL</div><div class="v">${escapeHtml(res.finalUrl || url)}</div></div>` +
      `<div class="resp-h">Headers</div><div class="kv">${headerRows || '<div class="v dim">(none)</div>'}</div>`;
    box.appendChild(meta);
  }

  if (preview) {
    const pre = document.createElement("pre");
    pre.className = "resp-body";
    pre.textContent = preview + (!isExpanded && bodyText.length > 300 ? " …" : "") + (res.bodyTruncated && isExpanded ? "\n\n[body truncated]" : "");
    box.appendChild(pre);
  }

  const toggle = document.createElement("button");
  toggle.className = "resp-toggle";
  toggle.textContent = isExpanded ? "▲ Less" : "▼ Details";
  toggle.addEventListener("click", (e) => { e.stopPropagation(); toggleExpand(url); });
  box.appendChild(toggle);

  return box;
}

function onUrlClick(url) {
  if (responseCache.has(url)) toggleExpand(url);
  else fetchOne(url);
}

function toggleExpand(url) {
  if (expanded.has(url)) expanded.delete(url);
  else expanded.add(url);
  render();
}

async function doFetch(url) {
  const res = await chrome.runtime.sendMessage({ type: "fetchUrl", url, method: methodEl.value });
  responseCache.set(url, res);
  return res;
}

async function fetchOne(url, refetch) {
  if (!refetch && responseCache.has(url)) return;
  responseCache.set(url, { ok: true, status: 0, statusText: "…", pending: true, method: methodEl.value, elapsedMs: 0, contentType: "" });
  render();
  await doFetch(url);
  render();
}

async function fetchAll() {
  const urls = visibleUrls().map((u) => u.url).filter((u) => !responseCache.has(u));
  if (!urls.length) {
    flashSummary("Everything shown is already fetched");
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
      if (done % 3 === 0 || done === urls.length) render();
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  render();
  flashSummary(`Fetched ${done} URL${done === 1 ? "" : "s"} — showing responses inline`);
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
      statusText: res && res.ok ? res.statusText : null,
      contentType: res && res.ok ? res.contentType : null,
      headers: res && res.ok ? res.headers : null,
      body: res && res.ok ? res.body : null,
      error: res && !res.ok ? res.error : null,
    };
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "urls-and-responses.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  flashSummary(`Exported ${data.length} URLs + responses`);
}

let flashTimer;
function flashSummary(msg) {
  clearTimeout(flashTimer);
  summaryEl.textContent = msg;
  flashTimer = setTimeout(render, 1800);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
