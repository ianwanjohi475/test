/**
 * KYC Popup Blocker
 *
 * Strategy: pass the real request through, then MUTATE the response so the
 * blocking KYC modal is reported as complete. This is batch-safe — tRPC packs
 * multiple queries into one positional array, so we can't just return a fake
 * array. Instead we walk whatever the server returned and neutralize only the
 * KYC/modal fields, leaving every other batched query intact.
 *
 * Optional: point NPOINT_BIN_URL at a bin to override kycDetails from a remote
 * source you control (created at https://www.npoint.io/).
 */

const NPOINT_BIN_URL = null; // e.g. "https://api.npoint.io/YOUR_BIN_ID"
const TARGET_PATH = "blockingModals.getBlockingModalRequirements";

const COMPLETED_KYC = {
  hasCompletedBlockingKyc: true,
  hasCompletedGeneralOnboarding: true,
  blockingKycCurrentStatus: "approved",
  hasCompletedRegularKyc: true,
};

const log = (...a) => console.log("%c[KYC Blocker]", "color:#5599ff", ...a);

let remoteKyc = null;
if (NPOINT_BIN_URL) {
  // Prefetch the override once so response mutation stays synchronous-ish.
  fetch(NPOINT_BIN_URL)
    .then((r) => r.json())
    .then((d) => { remoteKyc = d; log("loaded npoint override"); })
    .catch((e) => log("npoint fetch failed:", e));
}

/**
 * Recursively find and neutralize any KYC/modal state in a parsed response.
 * Returns true if anything was changed.
 */
function neutralize(node) {
  if (node === null || typeof node !== "object") return false;

  let changed = false;

  if (Array.isArray(node)) {
    for (const item of node) changed = neutralize(item) || changed;
    return changed;
  }

  // Kill any "active blocking modal" signal.
  if ("activeModal" in node && node.activeModal != null) {
    node.activeModal = null;
    changed = true;
  }

  // Overwrite kycDetails with a fully-completed state.
  if (node.kycDetails && typeof node.kycDetails === "object") {
    Object.assign(node.kycDetails, remoteKyc?.kycDetails || COMPLETED_KYC);
    changed = true;
  }

  // Generic: flip any boolean flag that reads like a completion gate.
  for (const key of Object.keys(node)) {
    if (typeof node[key] === "boolean" && /hasCompleted.*kyc/i.test(key)) {
      if (node[key] !== true) { node[key] = true; changed = true; }
    }
    if (/blockingKycCurrentStatus/i.test(key) && node[key] !== "approved") {
      node[key] = "approved";
      changed = true;
    }
  }

  for (const key of Object.keys(node)) {
    if (node[key] && typeof node[key] === "object") {
      changed = neutralize(node[key]) || changed;
    }
  }

  return changed;
}

// ---- fetch interception -------------------------------------------------
const _fetch = window.fetch.bind(window);

window.fetch = async function (input, init) {
  const url =
    typeof input === "string" ? input :
    input instanceof URL ? input.href :
    input?.url;

  const res = await _fetch(input, init);

  if (!url || !url.includes(TARGET_PATH)) return res;

  try {
    const clone = res.clone();
    const data = await clone.json();
    const changed = neutralize(data);
    log(changed ? "patched response ✓" : "no KYC fields found, passing through", url);

    return new Response(JSON.stringify(data), {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch (e) {
    log("failed to patch, passing original through:", e);
    return res;
  }
};

// ---- XHR interception (legacy fallback) --------------------------------
const _open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this._kycTarget = typeof url === "string" && url.includes(TARGET_PATH);
  return _open.call(this, method, url, ...rest);
};

const _send = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
  if (this._kycTarget) {
    this.addEventListener("readystatechange", function () {
      if (this.readyState !== 4) return;
      try {
        const data = JSON.parse(this.responseText);
        if (neutralize(data)) {
          const patched = JSON.stringify(data);
          Object.defineProperty(this, "responseText", { get: () => patched });
          Object.defineProperty(this, "response", { get: () => patched });
          log("patched XHR response ✓");
        }
      } catch (_) { /* not JSON, ignore */ }
    });
  }
  return _send.call(this, body);
};

// ---- DOM safety net -----------------------------------------------------
// Blocking modals usually lock scrolling; make sure the page stays usable
// even if a stale/cached modal briefly renders before our data lands.
new MutationObserver(() => {
  const b = document.body;
  if (b && getComputedStyle(b).overflow === "hidden") {
    b.style.overflow = "auto";
  }
}).observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["style", "class"] });

log("armed →", TARGET_PATH);
