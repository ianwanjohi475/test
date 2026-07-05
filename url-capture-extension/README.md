# URL & Response Capture

A browser extension (Chrome / Edge / Brave — Manifest V3) that captures **every
URL a page requests** along with the **full server response**, and lets you
**export it to a file** (HAR, JSON, or CSV). It's the same data you'd see in the
browser's DevTools *Network* tab, collected in one place and exportable.

## What it captures

There are two capture surfaces, because browsers deliberately restrict who can
read response *bodies*:

| Surface | Where | Sees | Response body? |
|---|---|---|---|
| **DevTools panel** ("URL Capture") | DevTools (F12) → *URL Capture* tab | All requests made by the inspected page | ✅ Yes — full body |
| **Toolbar popup** | Click the extension icon | All requests across **every** tab, always on | ❌ URL + method + status + type only |

Use the **popup** for a running list of every URL any site hits (even without
DevTools open). Use the **DevTools panel** when you also need the response
contents — JSON payloads, HTML, API responses, etc.

> Manifest V3's `webRequest` API cannot read response bodies at all; only the
> DevTools network API can. That's an intentional browser security boundary, so
> full-body capture requires DevTools to be open on the tab you're inspecting.

## Install (unpacked / developer mode)

1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `url-capture-extension/` folder.
4. Pin the extension from the puzzle-piece menu if you want the toolbar icon.

No build step — it's plain HTML/CSS/JS.

## Use it

### Full responses (DevTools panel)
1. Open any site, press **F12** to open DevTools.
2. Select the **URL Capture** tab.
3. Reload the page — requests stream in. Click any row to see request/response
   headers and the **response body**.
4. Filter with the search box, then export:
   - **HAR** — standard format; re-openable in DevTools, Charles, Fiddler, etc.
   - **JSON** — one object per request, bodies included.
   - **CSV** — flat URL list (time, method, status, type, size, URL).
5. `bodies` checkbox toggles whether response bodies are stored (turn off for
   lighter exports on heavy pages).

### Just the URLs (popup)
1. Click the toolbar icon.
2. See the live count; **Export JSON** / **Export CSV** to save the URL log.
3. **Pause** / **Resume** / **Clear** control the always-on logger.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest, permissions |
| `background.js` | Always-on URL logger (`webRequest`, all tabs) |
| `devtools.html/js` | Registers the DevTools panel |
| `panel.html/css/js` | The capture UI + HAR/JSON/CSV export (with bodies) |
| `popup.html/js` | Toolbar popup + URL-log export |
| `icons/` | Toolbar / panel icons |

## Permissions & why

- `webRequest` + `<all_urls>` — observe request URLs/status across sites.
- `storage` — remember the pause/resume state.
- `downloads` — save exported files from the popup.

## Scope & responsible use

This is a debugging/inspection tool that surfaces network data your own browser
already receives. It captures traffic for the pages **you** load in **your**
browser — it does not intercept anyone else's traffic. Response data can contain
personal info, auth tokens, and cookies, so treat exported HAR/JSON files as
sensitive and don't share them without scrubbing secrets. Only capture on sites
and accounts you're authorized to inspect.
