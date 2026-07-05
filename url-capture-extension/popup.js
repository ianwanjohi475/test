"use strict";

const els = {
  toggle: document.getElementById("toggle"),
  clear: document.getElementById("clear"),
  count: document.getElementById("count"),
  exportJson: document.getElementById("export-json"),
  exportCsv: document.getElementById("export-csv"),
};

let cache = { recording: true, entries: [] };

function send(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

async function refresh() {
  const r = await send({ type: "getLog" });
  if (!r) return;
  cache = r;
  els.count.textContent = `${r.count} URLs`;
  els.toggle.textContent = r.recording ? "Pause" : "Resume";
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename }, () => {
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  });
}

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

els.toggle.addEventListener("click", async () => {
  await send({ type: "setRecording", value: !cache.recording });
  refresh();
});

els.clear.addEventListener("click", async () => {
  await send({ type: "clearLog" });
  refresh();
});

els.exportJson.addEventListener("click", () => {
  download(`urls-${stamp()}.json`, JSON.stringify(cache.entries, null, 2), "application/json");
});

els.exportCsv.addEventListener("click", () => {
  const cols = ["time", "method", "status", "type", "url"];
  const lines = [cols.join(",")];
  for (const r of cache.entries) {
    lines.push([r.time, r.method, r.status, r.type, r.url].map(csvCell).join(","));
  }
  download(`urls-${stamp()}.csv`, lines.join("\n"), "text/csv");
});

refresh();
