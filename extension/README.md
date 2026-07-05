# URL Extractor & Responder — sidebar edition

A Chrome/Edge (Manifest V3) **side-panel** extension. It docks a sidebar next
to **any site**, extracts **every URL on the page**, and lets you **fetch each
URL to inspect its HTTP response** — status code, headers, timing, and body.

## What it does

- Opens as a **sidebar** (Chrome Side Panel) that stays open while you browse.
- Collects URLs from **two sources**, de-duplicated and tagged:
  - The **DOM**: links (`<a>`, `<area>`, `<link>`), images (`<img>`, `srcset`),
    scripts, iframes, media, form `action`s, inline `url(...)` styles, and bare
    `http(s)://…` URLs in page text.
  - **Everything the page actually loaded** over the network (via the
    Performance API) — the same set you'd see in DevTools › Network: scripts,
    CSS, `xhr`/`fetch` requests, images, fonts, media. Tagged `request`,
    `script`, `css`, `font`, etc.
- **Fetch all** grabs the response for every shown URL (6 in parallel) and
  shows **each URL together with its response inline** — status, content type,
  timing, and a body preview right under the URL. Click **▼ Details** on any
  row to expand the full headers and full body.
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
- `<all_urls>` host permission — so the service worker can fetch arbitrary
  extracted URLs and read their responses.

## Notes & limits

- Only the top document is scanned (not cross-origin iframes).
- Some servers still reject requests (auth, cookies, anti-bot); those show as
  an error in the detail view.
- Chrome pages (`chrome://`, the Web Store) can't be scanned by design.
- The Side Panel API needs Chrome 114+ / recent Edge.
