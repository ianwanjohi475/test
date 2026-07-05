# URL Extractor & Responder

A Chrome/Edge (Manifest V3) browser extension that **extracts every URL from
any site** you're on, and lets you **fetch each URL to inspect its HTTP
response** — status code, headers, timing, and body.

## What it does

- Scans the active tab and collects URLs from links (`<a>`, `<area>`,
  `<link>`), images (`<img>`, `srcset`), scripts, iframes, media, form
  `action`s, and bare `http(s)://…` URLs sitting in page text.
- De-duplicates and tags each URL by where it came from (link, image,
  script, frame, form, text…).
- Click any URL (or its **Fetch** button) to perform a `GET` and view:
  - status code + status text, whether it redirected, and the final URL
  - full response headers
  - content type and round-trip time
  - a preview of the response body (text/JSON/XML/SVG; large bodies are
    truncated, binaries are skipped)
- Filter the list, and **Copy** all visible URLs to the clipboard.

The fetch runs in the extension's background service worker, which holds the
`<all_urls>` host permission — so it can read many cross-origin responses that
a page script would be blocked from by CORS.

## Install (load unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin the extension and click its icon on any `http(s)` page.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest, permissions, popup + service worker |
| `content.js` | Injected on demand; walks the DOM and returns all URLs |
| `background.js` | Service worker; fetches a URL and returns its response |
| `popup.html/.css/.js` | The UI: list, filter, and response detail view |
| `icons/` | Toolbar icons |

## Permissions & why

- `activeTab` + `scripting` — inject the scanner into the current tab only
  when you click the icon (no background page access).
- `<all_urls>` host permission — required so the service worker can fetch
  arbitrary extracted URLs and read their responses.

## Notes & limits

- Only the top document is scanned by default (not cross-origin iframes).
- Some servers still reject requests (auth, cookies, anti-bot, or
  `Access-Control` on redirects); those show up as an error in the detail view.
- Chrome pages (`chrome://`, the Web Store) can't be scanned by design.
