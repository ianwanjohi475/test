// Injected into the active tab on demand. Walks the DOM and collects every
// URL it can find, then returns them as a de-duplicated, categorized list.
(function collectUrls() {
  const seen = new Map(); // absolute url -> { url, kinds:Set, text }

  function absolutize(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    // Skip non-navigable / non-fetchable schemes.
    if (/^(javascript:|mailto:|tel:|data:|blob:|about:|#)/i.test(raw)) return null;
    try {
      return new URL(raw, document.baseURI).href;
    } catch (e) {
      return null;
    }
  }

  function add(value, kind, text) {
    const url = absolutize(value);
    if (!url) return;
    let entry = seen.get(url);
    if (!entry) {
      entry = { url, kinds: new Set(), text: (text || "").trim().slice(0, 120) };
      seen.set(url, entry);
    }
    entry.kinds.add(kind);
    if (!entry.text && text) entry.text = text.trim().slice(0, 120);
  }

  // Anchors / links.
  document.querySelectorAll("a[href]").forEach((el) => add(el.getAttribute("href"), "link", el.textContent));
  document.querySelectorAll("area[href]").forEach((el) => add(el.getAttribute("href"), "link", el.getAttribute("alt")));
  document.querySelectorAll("link[href]").forEach((el) => add(el.getAttribute("href"), "resource", el.getAttribute("rel")));

  // Media & embeds.
  document.querySelectorAll("img[src]").forEach((el) => add(el.getAttribute("src"), "image", el.getAttribute("alt")));
  document.querySelectorAll("img[srcset], source[srcset]").forEach((el) => {
    (el.getAttribute("srcset") || "").split(",").forEach((part) => add(part.trim().split(/\s+/)[0], "image"));
  });
  document.querySelectorAll("script[src]").forEach((el) => add(el.getAttribute("src"), "script"));
  document.querySelectorAll("iframe[src], frame[src]").forEach((el) => add(el.getAttribute("src"), "frame"));
  document.querySelectorAll("video[src], audio[src], source[src], embed[src]").forEach((el) => add(el.getAttribute("src"), "media"));

  // Forms.
  document.querySelectorAll("form[action]").forEach((el) => add(el.getAttribute("action"), "form"));

  // Bare URLs sitting in text nodes.
  const urlRe = /\bhttps?:\/\/[^\s"'<>()]+/gi;
  const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const matches = node.nodeValue && node.nodeValue.match(urlRe);
    if (matches) matches.forEach((m) => add(m, "text"));
  }

  return Array.from(seen.values())
    .map((e) => ({ url: e.url, kinds: Array.from(e.kinds), text: e.text }))
    .sort((a, b) => a.url.localeCompare(b.url));
})();
