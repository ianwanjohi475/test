// Registers a "URL Capture" panel inside Chrome/Edge DevTools.
// The DevTools network API is the only place an extension can read full
// response *bodies* for any request the inspected page makes, so this is
// where the real capturing happens.
chrome.devtools.panels.create(
  "URL Capture",
  "icons/icon48.png",
  "panel.html",
  function (panel) {
    // panel created; panel.js drives the UI once its document loads.
  }
);
