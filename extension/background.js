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

chrome.tabs.onRemoved.addListener((tabId) => requestsByTab.delete(tabId));

// ---- Messaging ------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "getRequests") {
    const m = requestsByTab.get(msg.tabId);
    sendResponse(m ? Array.from(m.values()) : []);
    return; // synchronous
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
