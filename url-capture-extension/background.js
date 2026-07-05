"use strict";

// ---------------------------------------------------------------------------
// Background service worker — lightweight, always-on URL log.
//
// Unlike the DevTools panel, this runs whenever the extension is enabled and
// sees requests across every tab. Manifest V3's webRequest API cannot read
// response *bodies*, so this log covers URL, method, status, type and timing.
// For full response bodies, open the "URL Capture" DevTools panel.
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 5000; // ring buffer so memory stays bounded
let log = [];
let recording = true;
const pending = new Map(); // requestId -> partial record

function restore() {
  chrome.storage.local.get(["recording"], (r) => {
    if (typeof r.recording === "boolean") recording = r.recording;
  });
}
restore();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg && msg.type) {
    case "getLog":
      sendResponse({ recording, count: log.length, entries: log });
      return true;
    case "clearLog":
      log = [];
      updateBadge();
      sendResponse({ ok: true });
      return true;
    case "setRecording":
      recording = !!msg.value;
      chrome.storage.local.set({ recording });
      updateBadge();
      sendResponse({ ok: true, recording });
      return true;
    default:
      return false;
  }
});

function updateBadge() {
  const text = recording ? (log.length ? String(Math.min(log.length, 9999)) : "") : "off";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: recording ? "#1a73e8" : "#9aa0a6" });
}

chrome.webRequest.onBeforeRequest.addListener(
  (d) => {
    if (!recording) return;
    pending.set(d.requestId, {
      id: d.requestId,
      time: new Date(d.timeStamp).toISOString(),
      method: d.method,
      url: d.url,
      type: d.type,
      tabId: d.tabId,
      status: 0,
    });
  },
  { urls: ["<all_urls>"] }
);

function finalize(d, status) {
  if (!recording) return;
  const rec = pending.get(d.requestId) || {
    id: d.requestId,
    time: new Date(d.timeStamp).toISOString(),
    method: d.method,
    url: d.url,
    type: d.type,
    tabId: d.tabId,
  };
  rec.status = status || d.statusCode || 0;
  pending.delete(d.requestId);

  log.push(rec);
  if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES);
  updateBadge();
}

chrome.webRequest.onCompleted.addListener(
  (d) => finalize(d, d.statusCode),
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onErrorOccurred.addListener(
  (d) => finalize(d, 0),
  { urls: ["<all_urls>"] }
);

updateBadge();
