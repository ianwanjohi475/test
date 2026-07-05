// Popup controller: scans the active tab for URLs, renders them, and fetches
// individual URLs (via the background service worker) to show their response.

let allUrls = []; // [{ url, kinds, text }]
const responseCache = new Map(); // url -> response object from background

const listEl = document.getElementById("list");
const summaryEl = document.getElementById("summary");
const filterEl = document.getElementById("filter");
const detailEl = document.getElementById("detail");
const detailBodyEl = document.getElementById("detail-body");
const detailUrlEl = document.getElementById("detail-url");

document.getElementById("rescan").addEventListener("click", scan);
document.getElementById("copy").addEventListener("click", copyVisible);
document.getElementById("detail-back").addEventListener("click", () => detailEl.classList.add("hidden"));
filterEl.addEventListener("input", render);

init();

async function init() {
  await scan();
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function scan() {
  listEl.innerHTML = `<div class="empty">Scanning page…</div>`;
  summaryEl.textContent = "";
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id || !/^https?:/i.test(tab.url || "")) {
      listEl.innerHTML = `<div class="empty">This page can't be scanned.<br>Open a normal http(s) website and try again.</div>`;
      return;
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files: ["content.js"],
    });
    allUrls = (results && results[0] && results[0].result) || [];
    render();
  } catch (err) {
    listEl.innerHTML = `<div class="empty">Could not scan this page.<br><small>${escapeHtml(String(err.message || err))}</small></div>`;
  }
}

function filteredUrls() {
  const q = filterEl.value.trim().toLowerCase();
  if (!q) return allUrls;
  return allUrls.filter((u) => u.url.toLowerCase().includes(q) || (u.text || "").toLowerCase().includes(q));
}

function render() {
  const urls = filteredUrls();
  summaryEl.textContent = `${urls.length} of ${allUrls.length} URL${allUrls.length === 1 ? "" : "s"}`;
  if (!urls.length) {
    listEl.innerHTML = `<div class="empty">No URLs found${allUrls.length ? " for this filter" : ""}.</div>`;
    return;
  }
  listEl.innerHTML = "";
  for (const item of urls) {
    listEl.appendChild(renderRow(item));
  }
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

  const meta = document.createElement("div");
  meta.className = "meta";
  for (const kind of item.kinds) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = kind;
    meta.appendChild(chip);
  }

  const cached = responseCache.get(item.url);
  if (cached) meta.appendChild(statusBadge(cached));

  const actions = document.createElement("div");
  actions.className = "row-actions";
  const btn = document.createElement("button");
  btn.textContent = cached ? "View" : "Fetch";
  btn.addEventListener("click", () => showDetail(item.url));
  actions.appendChild(btn);
  meta.appendChild(actions);

  row.appendChild(meta);
  return row;
}

function statusBadge(res) {
  const span = document.createElement("span");
  span.className = "status";
  if (!res.ok) {
    span.classList.add("err");
    span.textContent = "ERR";
  } else {
    span.classList.add(res.redirected ? "redir" : res.status >= 400 ? "err" : "ok");
    span.textContent = `${res.status}`;
  }
  return span;
}

async function showDetail(url) {
  detailEl.classList.remove("hidden");
  detailUrlEl.textContent = url;
  detailBodyEl.innerHTML = `<div class="empty">Fetching…</div>`;

  let res = responseCache.get(url);
  if (!res) {
    res = await chrome.runtime.sendMessage({ type: "fetchUrl", url });
    responseCache.set(url, res);
    render(); // update the badge in the list
  }
  renderDetail(res);
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
      <p class="chip">${res.elapsedMs} ms</p>`;
    return;
  }

  const headerRows = Object.entries(res.headers || {})
    .map(([k, v]) => `<div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div>`)
    .join("");

  detailBodyEl.innerHTML = `
    <h2>Status</h2>
    <div class="kv">
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
  const text = filteredUrls().map((u) => u.url).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    flashSummary("Copied " + filteredUrls().length + " URLs");
  } catch (e) {
    flashSummary("Copy failed");
  }
}

let flashTimer;
function flashSummary(msg) {
  const prev = summaryEl.textContent;
  summaryEl.textContent = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (summaryEl.textContent = prev), 1500);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
