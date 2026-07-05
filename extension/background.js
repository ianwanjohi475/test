// Service worker: performs the actual HTTP fetch for a URL on behalf of the
// popup. Running the fetch here (with <all_urls> host permission) lets us read
// responses cross-origin that a page context would be blocked from by CORS.

const MAX_BODY = 20000; // characters of body to return to the popup

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "fetchUrl") {
    fetchUrl(msg.url).then(sendResponse);
    return true; // keep the message channel open for the async response
  }
});

async function fetchUrl(url) {
  const started = performance.now();
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", credentials: "omit" });
    const headers = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const contentType = res.headers.get("content-type") || "";
    let body = "";
    let bodyTruncated = false;
    // Only read text-ish bodies; skip large binaries.
    if (/^(text\/|application\/(json|javascript|xml|xhtml)|image\/svg)/i.test(contentType) || contentType === "") {
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
      elapsedMs: Math.round(performance.now() - started),
    };
  } catch (err) {
    return {
      ok: false,
      error: String(err && err.message ? err.message : err),
      elapsedMs: Math.round(performance.now() - started),
    };
  }
}
