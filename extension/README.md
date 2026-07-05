# URL Extractor & Responder — sidebar edition

A Chrome/Edge (Manifest V3) **side-panel** extension. It docks a sidebar next
to **any site**, extracts **every URL on the page**, and lets you **fetch each
URL to inspect its HTTP response** — status code, headers, timing, and body.

## What it does

- Opens as a **sidebar** (Chrome Side Panel) that stays open while you browse.
- Collects URLs from **three sources**, de-duplicated and tagged:
  - The **DOM**: links (`<a>`, `<area>`, `<link>`), images (`<img>`, `srcset`),
    scripts, iframes, media, form `action`s, inline `url(...)` styles, and bare
    `http(s)://…` URLs in page text.
  - The **Performance timeline** — resources the page loaded.
  - **Live network capture** (via `webRequest`) — every request the page fires,
    including dynamic **XHR/fetch POSTs like `graphql`** that never appear in
    the DOM or the (often-cleared) Performance timeline. This is why requests
    you only see in DevTools › Network now show up here too. Each live request
    also shows its **real observed status** (e.g. `200`, `POST`, `request`)
    without re-fetching — hit **Fetch** on it to also pull the body.

  > Live capture records requests from the moment the extension is running.
  > If a request already fired before you opened the sidebar, **reload the
  > page** (or hit **Rescan**) to capture it.
- **Fetch all** grabs the response for every shown URL (6 in parallel) and
  shows **each URL together with its response inline** — status, content type,
  timing, and a body preview right under the URL. Click **▼ Details** on any
  row to expand the full headers and full body.
- **🛰️ Deep capture** — the strongest mode. It attaches to the tab like the
  DevTools debugger, reloads the page, and records **every request together
  with its real response body** — including dynamic POST/XHR like `graphql`
  that a plain re-fetch can't reproduce. Those responses show inline and are
  included in **Export**. (Chrome shows a "started debugging this browser"
  banner while it's on; click **Deep capture** again to stop/detach.)
- **Export** downloads every shown URL **with its full response** (status,
  headers, and body) to `urls-and-responses.json` — from fetches, deep capture,
  or the live-observed status when a body wasn't pulled.
- **Interactive:**
  - **Auto** re-scan when you switch tabs or the page navigates (toggle off any time).
  - **Fetch** / **Refetch** a single URL, or **Fetch all** shown URLs.
  - **Filter** by text, and filter the list by result: `2xx / 3xx / 4xx / 5xx / Failed`.
  - **GET or HEAD** method switch.
  - **↗ Open** any URL in a new tab.
  - **Copy** all shown URLs, or **Export** every URL **with its full response**
    (headers + body) to `urls-and-responses.json`.

Fetches run in the background service worker (which holds `<all_urls>`), so it
can read many cross-origin responses a page script would be CORS-blocked from.

## Install (load unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `extension/` folder
   (or unzip the provided `.zip` first and select the unzipped folder).
4. Click the extension's toolbar icon on any `http(s)` page — the **sidebar opens**.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest, permissions, side panel + service worker |
| `content.js` | Injected on demand; walks the DOM and returns all URLs |
| `background.js` | Opens the side panel; fetches a URL and returns its response |
| `sidepanel.html/.css/.js` | The sidebar UI: list, filters, fetch, detail view |
| `icons/` | Toolbar icons |

## Permissions & why

- `sidePanel` — render the sidebar UI.
- `activeTab` + `scripting` — inject the scanner into the current tab.
- `tabs` — notice tab switches / navigations for auto re-scan.
- `webRequest` — observe the page's network requests so dynamic XHR/fetch
  calls (like `graphql`) are captured, not just DOM URLs.
- `debugger` — used only by **Deep capture** to read real response bodies via
  the DevTools protocol. Nothing attaches until you turn Deep capture on.
- `<all_urls>` host permission — so the service worker can fetch arbitrary
  extracted URLs and read their responses.

## Notes & limits

- Only the top document is scanned (not cross-origin iframes).
- Some servers still reject requests (auth, cookies, anti-bot); those show as
  an error in the detail view.
- Chrome pages (`chrome://`, the Web Store) can't be scanned by design.
- The Side Panel API needs Chrome 114+ / recent Edge.
