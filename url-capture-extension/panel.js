"use strict";

// ---------------------------------------------------------------------------
// URL & Response Capture — DevTools panel
//
// chrome.devtools.network.onRequestFinished hands us a HAR "entry" for every
// completed request on the inspected page, and entry.getContent() resolves the
// response body. This is the only extension surface that can read response
// bodies for arbitrary requests, which is why capture lives here rather than in
// the background service worker.
// ---------------------------------------------------------------------------

const state = {
  recording: true,
  captureBodies: true,
  filter: "",
  entries: [],        // normalized records we own
  selectedId: null,
};

let nextId = 1;

const els = {
  toggle: document.getElementById("toggle"),
  toggleLabel: document.getElementById("toggle-label"),
  clear: document.getElementById("clear"),
  filter: document.getElementById("filter"),
  captureBodies: document.getElementById("capture-bodies"),
  count: document.getElementById("count"),
  rows: document.getElementById("rows"),
  exportHar: document.getElementById("export-har"),
  exportJson: document.getElementById("export-json"),
  exportCsv: document.getElementById("export-csv"),
  detailPane: document.getElementById("detail-pane"),
  detailTitle: document.getElementById("detail-title"),
  detailBody: document.getElementById("detail-body"),
  detailClose: document.getElementById("detail-close"),
};

// --- Capture ---------------------------------------------------------------

chrome.devtools.network.onRequestFinished.addListener(function (har) {
  if (!state.recording) return;

  const req = har.request || {};
  const res = har.response || {};
  const content = res.content || {};

  const record = {
    id: nextId++,
    startedDateTime: har.startedDateTime || new Date().toISOString(),
    time: Math.round(har.time || 0),
    method: req.method || "",
    url: req.url || "",
    status: res.status || 0,
    statusText: res.statusText || "",
    mimeType: content.mimeType || "",
    resourceType: (har._resourceType || "").toLowerCase(),
    size: typeof content.size === "number" && content.size >= 0
      ? content.size
      : (res.bodySize && res.bodySize > 0 ? res.bodySize : 0),
    requestHeaders: req.headers || [],
    responseHeaders: res.headers || [],
    queryString: req.queryString || [],
    requestBody: req.postData ? (req.postData.text || "") : "",
    responseBody: null,     // filled in async below
    _har: har,              // keep raw entry for faithful HAR export
  };

  state.entries.push(record);
  if (matchesFilter(record)) appendRow(record);
  updateCount();

  if (state.captureBodies) {
    har.getContent(function (body, encoding) {
      record.responseBody = body || "";
      record.responseEncoding = encoding || "";
      if (record.id === state.selectedId) renderDetail(record);
    });
  }
});

// --- Filtering -------------------------------------------------------------

function matchesFilter(rec) {
  if (!state.filter) return true;
  const f = state.filter.toLowerCase();
  return (
    rec.url.toLowerCase().includes(f) ||
    rec.method.toLowerCase().includes(f) ||
    String(rec.status).includes(f) ||
    rec.mimeType.toLowerCase().includes(f) ||
    rec.resourceType.includes(f)
  );
}

function rebuildRows() {
  els.rows.textContent = "";
  for (const rec of state.entries) {
    if (matchesFilter(rec)) appendRow(rec);
  }
  updateCount();
}

// --- Rendering the list ----------------------------------------------------

function statusClass(status) {
  if (status >= 200 && status < 300) return "s-ok";
  if (status >= 300 && status < 400) return "s-redir";
  if (status >= 400 || status === 0) return "s-err";
  return "";
}

function humanSize(n) {
  if (!n) return "—";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

function appendRow(rec) {
  const tr = document.createElement("tr");
  tr.dataset.id = rec.id;
  if (rec.id === state.selectedId) tr.classList.add("selected");

  const method = document.createElement("td");
  method.textContent = rec.method;

  const status = document.createElement("td");
  status.textContent = rec.status || "—";
  status.className = statusClass(rec.status);

  const type = document.createElement("td");
  type.textContent = rec.resourceType || shortMime(rec.mimeType);

  const url = document.createElement("td");
  url.className = "url col-url";
  url.title = rec.url;
  url.textContent = rec.url;

  const size = document.createElement("td");
  size.className = "col-size";
  size.textContent = humanSize(rec.size);

  tr.append(method, status, type, url, size);
  tr.addEventListener("click", () => selectRow(rec.id));
  els.rows.appendChild(tr);
}

function shortMime(m) {
  if (!m) return "";
  return m.split(";")[0].split("/").pop();
}

function updateCount() {
  const shown = els.rows.children.length;
  const total = state.entries.length;
  els.count.textContent =
    shown === total
      ? `${total} request${total === 1 ? "" : "s"}`
      : `${shown} / ${total} requests`;
}

// --- Detail pane -----------------------------------------------------------

function selectRow(id) {
  state.selectedId = id;
  for (const tr of els.rows.children) {
    tr.classList.toggle("selected", Number(tr.dataset.id) === id);
  }
  const rec = state.entries.find((r) => r.id === id);
  if (rec) renderDetail(rec);
}

function headerTable(headers) {
  const kv = document.createElement("div");
  kv.className = "kv";
  if (!headers.length) {
    const none = document.createElement("div");
    none.className = "k";
    none.textContent = "(none)";
    kv.appendChild(none);
    return kv;
  }
  for (const h of headers) {
    const k = document.createElement("div");
    k.className = "k";
    k.textContent = h.name;
    const v = document.createElement("div");
    v.className = "v";
    v.textContent = h.value;
    kv.append(k, v);
  }
  return kv;
}

function section(title, node) {
  const wrap = document.createElement("div");
  wrap.className = "detail-section";
  const h = document.createElement("h4");
  h.textContent = title;
  wrap.append(h, node);
  return wrap;
}

function renderDetail(rec) {
  els.detailPane.classList.remove("hidden");
  els.detailTitle.textContent = `${rec.method} ${rec.status || ""}`.trim();
  els.detailBody.textContent = "";

  const general = document.createElement("div");
  general.className = "kv";
  const add = (k, v) => {
    const kn = document.createElement("div");
    kn.className = "k"; kn.textContent = k;
    const vn = document.createElement("div");
    vn.className = "v"; vn.textContent = v;
    general.append(kn, vn);
  };
  add("URL", rec.url);
  add("Method", rec.method);
  add("Status", `${rec.status} ${rec.statusText}`.trim());
  add("Type", rec.resourceType || rec.mimeType || "—");
  add("MIME", rec.mimeType || "—");
  add("Size", humanSize(rec.size));
  add("Time", rec.time + " ms");
  add("When", rec.startedDateTime);
  els.detailBody.appendChild(section("General", general));

  els.detailBody.appendChild(section("Request headers", headerTable(rec.requestHeaders)));

  if (rec.requestBody) {
    const pre = document.createElement("pre");
    pre.className = "body";
    pre.textContent = rec.requestBody;
    els.detailBody.appendChild(section("Request payload", pre));
  }

  els.detailBody.appendChild(section("Response headers", headerTable(rec.responseHeaders)));

  const pre = document.createElement("pre");
  pre.className = "body";
  if (rec.responseBody == null) {
    pre.textContent = state.captureBodies
      ? "Loading response body…"
      : "Body capture is off (enable the 'bodies' checkbox before the request).";
  } else if (rec.responseBody === "") {
    pre.textContent = "(empty)";
  } else {
    pre.textContent = rec.responseBody;
  }
  els.detailBody.appendChild(section("Response body", pre));
}

// --- Export ----------------------------------------------------------------

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Which records to export: whatever the current filter shows.
function exportSet() {
  return state.entries.filter(matchesFilter);
}

function exportHar() {
  const set = exportSet();
  const har = {
    log: {
      version: "1.2",
      creator: { name: "URL & Response Capture", version: "1.0.0" },
      entries: set.map((r) => {
        const e = r._har;
        // Inline the captured body into the HAR entry so the export is
        // self-contained even though getContent() resolves it lazily.
        if (r.responseBody != null && e.response && e.response.content) {
          e.response.content.text = r.responseBody;
          if (r.responseEncoding) e.response.content.encoding = r.responseEncoding;
        }
        return e;
      }),
    },
  };
  download(`capture-${stamp()}.har`, JSON.stringify(har, null, 2), "application/json");
}

function exportJson() {
  const set = exportSet().map((r) => ({
    startedDateTime: r.startedDateTime,
    method: r.method,
    url: r.url,
    status: r.status,
    statusText: r.statusText,
    mimeType: r.mimeType,
    resourceType: r.resourceType,
    size: r.size,
    timeMs: r.time,
    requestHeaders: r.requestHeaders,
    requestBody: r.requestBody,
    responseHeaders: r.responseHeaders,
    responseBody: r.responseBody,
  }));
  download(`capture-${stamp()}.json`, JSON.stringify(set, null, 2), "application/json");
}

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function exportCsv() {
  const set = exportSet();
  const cols = ["startedDateTime", "method", "status", "resourceType", "mimeType", "size", "timeMs", "url"];
  const lines = [cols.join(",")];
  for (const r of set) {
    lines.push([
      r.startedDateTime, r.method, r.status, r.resourceType,
      r.mimeType, r.size, r.time, r.url,
    ].map(csvCell).join(","));
  }
  download(`capture-${stamp()}.csv`, lines.join("\n"), "text/csv");
}

// --- Wiring ----------------------------------------------------------------

els.toggle.addEventListener("click", () => {
  state.recording = !state.recording;
  els.toggle.classList.toggle("paused", !state.recording);
  els.toggleLabel.textContent = state.recording ? "Recording" : "Paused";
});

els.clear.addEventListener("click", () => {
  state.entries = [];
  state.selectedId = null;
  els.rows.textContent = "";
  els.detailPane.classList.add("hidden");
  updateCount();
});

els.filter.addEventListener("input", () => {
  state.filter = els.filter.value.trim();
  rebuildRows();
});

els.captureBodies.addEventListener("change", () => {
  state.captureBodies = els.captureBodies.checked;
});

els.detailClose.addEventListener("click", () => {
  state.selectedId = null;
  els.detailPane.classList.add("hidden");
  for (const tr of els.rows.children) tr.classList.remove("selected");
});

els.exportHar.addEventListener("click", exportHar);
els.exportJson.addEventListener("click", exportJson);
els.exportCsv.addEventListener("click", exportCsv);

updateCount();
