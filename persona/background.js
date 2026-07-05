// Background service worker: the single owner of the media library.
// Content scripts (which run in each website's origin and can't see the
// extension's IndexedDB) ask this worker for the library and for individual
// files over runtime messaging.

importScripts("db.js");

const api = globalThis.browser || globalThis.chrome;

// Whether we intercept clicks on file-upload fields. Kept in chrome.storage so
// popup and every content script see the same value instantly.
async function isArmed() {
  const { armed } = await api.storage.local.get({ armed: true });
  return armed;
}

api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg && msg.type) {
      case "list":
        sendResponse({ ok: true, items: await PersonaDB.list() });
        break;
      case "get": {
        const rec = await PersonaDB.get(msg.id);
        sendResponse(
          rec
            ? { ok: true, item: { name: rec.name, mime: rec.mime, dataUrl: rec.dataUrl } }
            : { ok: false, error: "not found" }
        );
        break;
      }
      case "armed":
        sendResponse({ ok: true, armed: await isArmed() });
        break;
      default:
        sendResponse({ ok: false, error: "unknown message" });
    }
  })().catch((e) => sendResponse({ ok: false, error: String(e) }));
  return true; // keep the channel open for the async response
});

// Reflect the armed state on the toolbar icon badge.
async function refreshBadge() {
  const on = await isArmed();
  try {
    await api.action.setBadgeText({ text: on ? "" : "off" });
    await api.action.setBadgeBackgroundColor({ color: "#888" });
  } catch (_) {
    /* action badge not available in some contexts */
  }
}
api.storage.onChanged.addListener((changes) => {
  if (changes.armed) refreshBadge();
});
api.runtime.onInstalled.addListener(refreshBadge);
api.runtime.onStartup && api.runtime.onStartup.addListener(refreshBadge);
