// Popup: manage the media library and the "intercept uploads" toggle.
// Popup and background share the extension origin, so this talks to IndexedDB
// (PersonaDB from db.js) directly.

const api = globalThis.browser || globalThis.chrome;

const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const fileInput = document.getElementById("file");
const addBtn = document.getElementById("addBtn");
const armed = document.getElementById("armed");
const armedLabel = document.getElementById("armedLabel");

const MAX_THUMB = 256; // px, longest edge

addBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", onFilesPicked);

armed.addEventListener("change", async () => {
  await api.storage.local.set({ armed: armed.checked });
  armedLabel.textContent = armed.checked
    ? "Intercepting upload fields"
    : "Off — websites use the normal file picker";
});

init();

async function init() {
  const { armed: on } = await api.storage.local.get({ armed: true });
  armed.checked = on;
  armedLabel.textContent = on
    ? "Intercepting upload fields"
    : "Off — websites use the normal file picker";
  render();
}

async function onFilesPicked(e) {
  const files = [...e.target.files];
  fileInput.value = "";
  for (const f of files) {
    try {
      const dataUrl = await readAsDataUrl(f);
      const thumbUrl = await makeThumb(f, dataUrl);
      await PersonaDB.add({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        mime: f.type,
        dataUrl,
        thumbUrl,
        addedAt: Date.now(),
      });
    } catch (err) {
      console.error("Persona: could not add", f.name, err);
      alert(`Could not add ${f.name}: ${err.message || err}`);
    }
  }
  render();
}

async function render() {
  const items = await PersonaDB.list();
  grid.innerHTML = "";
  empty.hidden = items.length > 0;
  for (const it of items) {
    const cell = document.createElement("div");
    cell.className = "cell";
    const isVideo = (it.mime || "").startsWith("video");
    cell.innerHTML = `
      <img src="${it.thumbUrl || ""}" alt="">
      ${isVideo ? '<span class="play">▶</span>' : ""}
      <span class="cname"></span>
      <button class="del" title="Remove">&times;</button>`;
    cell.querySelector(".cname").textContent = it.name;
    cell.querySelector(".del").addEventListener("click", async () => {
      await PersonaDB.remove(it.id);
      render();
    });
    grid.appendChild(cell);
  }
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

// Downscaled JPEG thumbnail: from the image itself, or a video's first frame.
async function makeThumb(file, dataUrl) {
  try {
    if (file.type.startsWith("image/")) {
      const img = await loadImage(dataUrl);
      return drawThumb(img, img.naturalWidth, img.naturalHeight);
    }
    if (file.type.startsWith("video/")) {
      return await videoThumb(dataUrl);
    }
  } catch (_) {
    /* fall through to placeholder */
  }
  return PLACEHOLDER;
}

function drawThumb(src, w, h) {
  const scale = Math.min(1, MAX_THUMB / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  c.getContext("2d").drawImage(src, 0, 0, cw, ch);
  return c.toDataURL("image/jpeg", 0.8);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function videoThumb(dataUrl) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "metadata";
    const done = (result) => {
      v.removeAttribute("src");
      resolve(result);
    };
    v.onloadeddata = () => {
      try {
        v.currentTime = Math.min(0.1, v.duration || 0.1);
      } catch (_) {
        done(PLACEHOLDER);
      }
    };
    v.onseeked = () => {
      try {
        done(drawThumb(v, v.videoWidth, v.videoHeight));
      } catch (_) {
        done(PLACEHOLDER);
      }
    };
    v.onerror = () => done(PLACEHOLDER);
    // Safety net if the browser never fires seeked (some codecs).
    setTimeout(() => done(PLACEHOLDER), 4000);
    v.src = dataUrl;
  });
}

// 1x1 grey pixel — used when no thumbnail can be rendered.
const PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAMzMzAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
