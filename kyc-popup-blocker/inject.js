/**
 * KYC Popup Blocker
 *
 * Intercepts fetch calls to blockingModals.getBlockingModalRequirements
 * and returns a spoofed response indicating KYC is complete.
 *
 * To use a live npoint bin instead of the hardcoded payload, create a bin at
 * https://www.npoint.io/ with your JSON, then set NPOINT_BIN_URL below.
 */

const NPOINT_BIN_URL = null; // e.g. "https://api.npoint.io/YOUR_BIN_ID"

const SPOOFED_RESPONSE = [
  {
    result: {
      data: {
        json: {
          activeModal: null,
          kycDetails: {
            hasCompletedBlockingKyc: true,
            hasCompletedGeneralOnboarding: true,
            blockingKycCurrentStatus: "approved",
            hasCompletedRegularKyc: true,
          },
        },
      },
    },
  },
];

const TARGET_PATH = "blockingModals.getBlockingModalRequirements";

const _fetch = window.fetch.bind(window);

window.fetch = async function (input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (url && url.includes(TARGET_PATH)) {
    console.log("[KYC Blocker] Intercepted →", url);

    if (NPOINT_BIN_URL) {
      try {
        const res = await _fetch(NPOINT_BIN_URL);
        const payload = await res.json();
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        console.warn("[KYC Blocker] npoint fetch failed, falling back to hardcoded payload:", e);
      }
    }

    return new Response(JSON.stringify(SPOOFED_RESPONSE), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return _fetch(input, init);
};

// Also patch XMLHttpRequest for any legacy callers
const _open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this._kycTarget = typeof url === "string" && url.includes(TARGET_PATH);
  return _open.call(this, method, url, ...rest);
};

const _send = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body) {
  if (!this._kycTarget) return _send.call(this, body);

  console.log("[KYC Blocker] Intercepted XHR →", TARGET_PATH);

  Object.defineProperty(this, "readyState", { get: () => 4 });
  Object.defineProperty(this, "status", { get: () => 200 });
  Object.defineProperty(this, "responseText", {
    get: () => JSON.stringify(SPOOFED_RESPONSE),
  });
  Object.defineProperty(this, "response", {
    get: () => JSON.stringify(SPOOFED_RESPONSE),
  });

  setTimeout(() => {
    const evt = new Event("readystatechange");
    this.dispatchEvent(evt);
    this.dispatchEvent(new Event("load"));
    if (typeof this.onreadystatechange === "function") this.onreadystatechange(evt);
    if (typeof this.onload === "function") this.onload(new Event("load"));
  }, 0);
};
