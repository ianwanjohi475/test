// Service worker:
//  1. Opens the side panel when the toolbar icon is clicked.
//  2. OBSERVES the network with webRequest so every request the page makes
//     (including dynamic XHR/fetch POSTs like graphql) is captured live —
//     the same set you see in DevTools › Network. The Performance API alone
//     misses these because SPAs clear their resource timeline.
//  3. Fetches a chosen URL and returns its full HTTP response.

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.warn("setPanelBehavior failed:", err));

// ---- Live network capture -------------------------------------------------

// tabId -> Map(requestUrl -> record)
const requestsByTab = new Map();

function tabMap(tabId) {
  let m = requestsByTab.get(tabId);
  if (!m) {
    m = new Map();
    requestsByTab.set(tabId, m);
  }
  return m;
}

function record(tabId, url) {
  const m = tabMap(tabId);
  let r = m.get(url);
  if (!r) {
    r = { url, method: "", type: "", status: null, statusLine: "", fromCache: false, error: null, count: 0 };
    m.set(url, r);
  }
  return r;
}

const isHttp = (u) => typeof u === "string" && /^https?:\/\//i.test(u);

chrome.webRequest.onBeforeRequest.addListener(
  (d) => {
    if (d.tabId < 0 || !isHttp(d.url)) return;
    // A new top-level navigation starts a fresh request set for that tab.
    if (d.type === "main_frame") requestsByTab.set(d.tabId, new Map());
    const r = record(d.tabId, d.url);
    r.method = d.method;
    r.type = d.type;
    r.count++;
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onCompleted.addListener(
  (d) => {
    if (d.tabId < 0 || !isHttp(d.url)) return;
    const r = record(d.tabId, d.url);
    r.status = d.statusCode;
    r.statusLine = d.statusLine || "";
    r.fromCache = d.fromCache;
    r.type = r.type || d.type;
    r.method = r.method || d.method;
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onErrorOccurred.addListener(
  (d) => {
    if (d.tabId < 0 || !isHttp(d.url)) return;
    const r = record(d.tabId, d.url);
    r.error = d.error;
  },
  { urls: ["<all_urls>"] }
);

chrome.tabs.onRemoved.addListener((tabId) => {
  requestsByTab.delete(tabId);
  deepByTab.delete(tabId);
});

// ---- Deep capture via the DevTools protocol (real response BODIES) ---------
// webRequest gives URL + status but never the response body. Attaching the
// debugger lets us read the actual body of every request, including dynamic
// POST/XHR like graphql — the full "url + its response".

const DEEP_MAX_BODY = 60000;
const deepByTab = new Map(); // tabId -> { reqs: Map(requestId->rec), byUrl: Map(url->rec) }

function deepState(tabId) {
  let s = deepByTab.get(tabId);
  if (!s) {
    s = { reqs: new Map(), byUrl: new Map() };
    deepByTab.set(tabId, s);
  }
  return s;
}

function sendDbg(tabId, cmd, params) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, cmd, params || {}, (r) => {
      const e = chrome.runtime.lastError;
      if (e) reject(e);
      else resolve(r);
    });
  });
}

function decodeBody(resp, mime) {
  if (!resp) return "";
  let text = resp.body || "";
  if (resp.base64Encoded) {
    if (/^(text\/|application\/(json|javascript|xml|xhtml)|image\/svg|application\/x-www-form)/i.test(mime || "")) {
      try {
        text = decodeURIComponent(escape(atob(text)));
      } catch (e) {
        try { text = atob(text); } catch (_) { text = "[base64 body — could not decode]"; }
      }
    } else {
      return `[binary body: ${mime || "unknown"}]`;
    }
  }
  if (text.length > DEEP_MAX_BODY) text = text.slice(0, DEEP_MAX_BODY) + "\n\n[body truncated]";
  return text;
}

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  const tabId = source.tabId;
  if (tabId == null || !deepByTab.has(tabId)) return;
  const s = deepState(tabId);

  if (method === "Network.requestWillBeSent") {
    const r = s.reqs.get(params.requestId) || {};
    r.url = params.request.url;
    r.method = params.request.method;
    r.type = params.type || r.type;
    r.postData = params.request.postData || r.postData;
    s.reqs.set(params.requestId, r);
  } else if (method === "Network.responseReceived") {
    const r = s.reqs.get(params.requestId) || {};
    const resp = params.response || {};
    r.url = resp.url || r.url;
    r.status = resp.status;
    r.statusText = resp.statusText || "";
    r.headers = resp.headers || {};
    r.mimeType = resp.mimeType || "";
    r.type = params.type || r.type;
    s.reqs.set(params.requestId, r);
  } else if (method === "Network.loadingFinished") {
    const r = s.reqs.get(params.requestId);
    if (!r || !isHttp(r.url)) return;
    try {
      const body = await sendDbg(tabId, "Network.getResponseBody", { requestId: params.requestId });
      r.body = decodeBody(body, r.mimeType);
    } catch (e) {
      r.body = `[body unavailable: ${e && e.message ? e.message : e}]`;
    }
    s.byUrl.set(r.url, r);
  } else if (method === "Network.loadingFailed") {
    const r = s.reqs.get(params.requestId);
    if (r && isHttp(r.url)) {
      r.error = params.errorText || "failed";
      s.byUrl.set(r.url, r);
    }
  }
});

// If the user closes the debugger banner or DevTools takes over, forget state.
chrome.debugger.onDetach.addListener((source) => {
  // Keep whatever we already captured; just mark it not-live by leaving data.
  void source;
});

async function startDeep(tabId) {
  try {
    await new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId }, "1.3", () => {
        const e = chrome.runtime.lastError;
        if (e && !/already attached/i.test(e.message || "")) reject(e);
        else resolve();
      });
    });
    deepByTab.set(tabId, { reqs: new Map(), byUrl: new Map() });
    await sendDbg(tabId, "Network.enable", {});
    await sendDbg(tabId, "Page.enable", {});
    await sendDbg(tabId, "Page.reload", { ignoreCache: false });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

async function stopDeep(tabId) {
  try {
    await new Promise((resolve) => {
      chrome.debugger.detach({ tabId }, () => {
        void chrome.runtime.lastError;
        resolve();
      });
    });
  } catch (e) { /* ignore */ }
  return { ok: true };
}

// ---- Messaging ------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "getRequests") {
    const m = requestsByTab.get(msg.tabId);
    sendResponse(m ? Array.from(m.values()) : []);
    return; // synchronous
  }
  if (msg && msg.type === "getDeep") {
    const s = deepByTab.get(msg.tabId);
    sendResponse(s ? Array.from(s.byUrl.values()) : []);
    return; // synchronous
  }
  if (msg && msg.type === "startDeep") {
    startDeep(msg.tabId).then(sendResponse);
    return true; // async
  }
  if (msg && msg.type === "stopDeep") {
    stopDeep(msg.tabId).then(sendResponse);
    return true; // async
  }
  if (msg && msg.type === "fetchUrl") {
    fetchUrl(msg.url, msg.method || "GET").then(sendResponse);
    return true; // async
  }
});

// ---- Manual fetch ---------------------------------------------------------

const MAX_BODY = 20000; // characters of body to return to the panel

async function fetchUrl(url, method) {
  const started = performance.now();
  try {
    const res = await fetch(url, { method, redirect: "follow", credentials: "include" });
    const headers = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const contentType = res.headers.get("content-type") || "";
    let body = "";
    let bodyTruncated = false;

    if (method === "HEAD") {
      body = "[HEAD request — no body]";
    } else if (/^(text\/|application\/(json|javascript|xml|xhtml)|image\/svg)/i.test(contentType) || contentType === "") {
      const text = await res.text();
      if (text.length > MAX_BODY) {
        body = text.slice(0, MAX_BODY);
        bodyTruncated = true;
      } else {
        body = text;
      }
    } else {
      body = `[binary or non-text body: ${contentType}]`;
    }

    return {
      ok: true,
      status: res.status,
      statusText: res.statusText,
      finalUrl: res.url,
      redirected: res.redirected,
      contentType,
      headers,
      body,
      bodyTruncated,
      method,
      elapsedMs: Math.round(performance.now() - started),
    };
  } catch (err) {
    return {
      ok: false,
      error: String(err && err.message ? err.message : err),
      method,
      elapsedMs: Math.round(performance.now() - started),
    };
  }
}
