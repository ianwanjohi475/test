/**
 * KYC Popup Blocker
 *
 * Intercepts two tRPC endpoints and mutates their responses so KYC shows
 * as fully completed — visually rendering "Verify your identity" as
 * struck-through (done) just like the Download row.
 *
 * Targets:
 *   1. blockingModals.getBlockingModalRequirements — kills the blocking gate
 *   2. profile.getSelf — marks all KYC / identity fields as complete
 *
 * npoint bins: create bins at https://www.npoint.io/ and paste the IDs below
 * to control the patch payloads remotely without touching this file.
 */

// ── npoint bin URLs (set to null to use hardcoded defaults) ────────────────
const NPOINT_BLOCKING_MODAL = null; // e.g. "https://api.npoint.io/XXXXXXXX"
const NPOINT_PROFILE_SELF   = null; // e.g. "https://api.npoint.io/YYYYYYYY"

// ── hardcoded patch payloads ───────────────────────────────────────────────
const MODAL_PATCH = {
  activeModal: null,
  kycDetails: {
    hasCompletedBlockingKyc: true,
    hasCompletedGeneralOnboarding: true,
    blockingKycCurrentStatus: "approved",
    hasCompletedRegularKyc: true,
  },
};

const PROFILE_PATCH = {
  isFullyOnboarded: true,
  requiresOnboardingSurvey: false,
  requiresIdentityVerification: false,
  hasCompletedKyc: true,
  hasCompletedIdentityVerification: true,
  hasSubmittedIdentityVerification: true,
};

// ── targets ────────────────────────────────────────────────────────────────
const TARGETS = [
  {
    path: "blockingModals.getBlockingModalRequirements",
    npointUrl: NPOINT_BLOCKING_MODAL,
    patch: MODAL_PATCH,
    remoteData: null,
  },
  {
    path: "profile.getSelf",
    npointUrl: NPOINT_PROFILE_SELF,
    patch: PROFILE_PATCH,
    remoteData: null,
  },
];

const log = (...a) => console.log("%c[KYC Blocker]", "color:#5599ff;font-weight:bold", ...a);

// Prefetch npoint overrides once at startup
const _nativeFetch = window.fetch.bind(window);
for (const t of TARGETS) {
  if (t.npointUrl) {
    _nativeFetch(t.npointUrl)
      .then((r) => r.json())
      .then((d) => { t.remoteData = d; log(`npoint loaded for ${t.path}`); })
      .catch((e) => log(`npoint fetch failed for ${t.path}:`, e));
  }
}

// ── recursive patcher ──────────────────────────────────────────────────────
function applyPatch(node, patch) {
  if (node === null || typeof node !== "object") return false;
  let changed = false;

  if (Array.isArray(node)) {
    for (const item of node) changed = applyPatch(item, patch) || changed;
    return changed;
  }

  // Apply flat key-value overrides anywhere the key appears in this object
  for (const [key, val] of Object.entries(patch)) {
    if (key in node) {
      if (typeof val === "object" && val !== null && typeof node[key] === "object") {
        // Merge nested objects (e.g. kycDetails)
        Object.assign(node[key], val);
      } else {
        node[key] = val;
      }
      changed = true;
    }
  }

  // Recurse into child objects
  for (const key of Object.keys(node)) {
    if (node[key] && typeof node[key] === "object") {
      changed = applyPatch(node[key], patch) || changed;
    }
  }

  return changed;
}

function matchTarget(url) {
  for (const t of TARGETS) {
    if (url && url.includes(t.path)) return t;
  }
  return null;
}

function effectivePatch(target) {
  return target.remoteData || target.patch;
}

// ── fetch interception ─────────────────────────────────────────────────────
window.fetch = async function (input, init) {
  const url =
    typeof input === "string" ? input :
    input instanceof URL ? input.href :
    input?.url;

  const target = matchTarget(url);
  const res = await _nativeFetch(input, init);
  if (!target) return res;

  try {
    const data = await res.clone().json();
    const changed = applyPatch(data, effectivePatch(target));
    log(changed ? `✓ patched [${target.path}]` : `no matching fields [${target.path}]`);

    return new Response(JSON.stringify(data), {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch (e) {
    log("patch error, passing original:", e);
    return res;
  }
};

// ── XHR interception ───────────────────────────────────────────────────────
const _open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this._kycTarget = matchTarget(typeof url === "string" ? url : "");
  return _open.call(this, method, url, ...rest);
};

const _send = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
  if (this._kycTarget) {
    const target = this._kycTarget;
    this.addEventListener("readystatechange", function () {
      if (this.readyState !== 4) return;
      try {
        const data = JSON.parse(this.responseText);
        if (applyPatch(data, effectivePatch(target))) {
          const patched = JSON.stringify(data);
          Object.defineProperty(this, "responseText", { get: () => patched });
          Object.defineProperty(this, "response",     { get: () => patched });
          log(`✓ patched XHR [${target.path}]`);
        }
      } catch (_) {}
    });
  }
  return _send.call(this, body);
};

// ── scroll-lock safety net ─────────────────────────────────────────────────
// In case a cached modal briefly renders before our patch lands
new MutationObserver(() => {
  const b = document.body;
  if (b && getComputedStyle(b).overflow === "hidden") b.style.overflow = "auto";
}).observe(document.documentElement, {
  attributes: true,
  subtree: true,
  attributeFilter: ["style", "class"],
});

log("armed →", TARGETS.map((t) => t.path).join(", "));
