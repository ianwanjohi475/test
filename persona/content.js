// Runs on every page. When you click a file-upload field (or a styled button
// that opens one), we intercept the native file dialog and offer your persona
// media library instead. Pick one (or several) and it's injected into the
// field exactly as if you'd browsed to it on disk.

(() => {
  const api = globalThis.browser || globalThis.chrome;
  let bypassNext = null; // an input we should let through to the native picker

  // --- intercept file-input activation ---------------------------------------
  document.addEventListener(
    "click",
    async (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "file") return;
      if (bypassNext === input) {
        bypassNext = null;
        return; // user asked for the real device picker this once
      }
      let armed;
      try {
        armed = (await send({ type: "armed" })).armed;
      } catch (_) {
        return; // extension context gone (e.g. reloaded) — do nothing
      }
      if (!armed) return;

      e.preventDefault();
      e.stopPropagation();
      openChooser(input);
    },
    true // capture phase, so we run before the page's own handlers
  );

  function send(msg) {
    return new Promise((resolve, reject) => {
      try {
        api.runtime.sendMessage(msg, (resp) => {
          const err = api.runtime.lastError;
          if (err) return reject(new Error(err.message));
          resolve(resp || {});
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // --- the chooser overlay ---------------------------------------------------
  async function openChooser(input) {
    const { items } = await send({ type: "list" });
    const multiple = input.multiple;

    const root = document.createElement("div");
    root.className = "persona-overlay";
    root.innerHTML = `
      <div class="persona-panel" role="dialog" aria-label="Choose persona media">
        <div class="persona-head">
          <span class="persona-title">Persona media</span>
          <button class="persona-x" title="Close">&times;</button>
        </div>
        <div class="persona-grid"></div>
        <div class="persona-foot">
          <span class="persona-hint">${
            multiple ? "Click to select, then Insert." : "Click an item to insert it."
          }</span>
          <span class="persona-actions">
            <button class="persona-btn persona-device">Use device file…</button>
            <button class="persona-btn persona-insert" ${multiple ? "" : "hidden"} disabled>Insert</button>
          </span>
        </div>
      </div>`;

    const grid = root.querySelector(".persona-grid");
    const insertBtn = root.querySelector(".persona-insert");
    const selected = new Set();

    if (!items || items.length === 0) {
      grid.innerHTML =
        '<div class="persona-empty">Your library is empty.<br>Open the Persona toolbar icon to add images or videos.</div>';
    }

    (items || []).forEach((it) => {
      const cell = document.createElement("button");
      cell.className = "persona-cell";
      cell.title = it.name;
      const isVideo = (it.mime || "").startsWith("video");
      cell.innerHTML = `
        <img class="persona-thumb" src="${it.thumbUrl || ""}" alt="">
        ${isVideo ? '<span class="persona-play">▶</span>' : ""}
        <span class="persona-name">${escapeHtml(it.name)}</span>`;
      cell.addEventListener("click", async () => {
        if (multiple) {
          cell.classList.toggle("sel");
          if (selected.has(it.id)) selected.delete(it.id);
          else selected.add(it.id);
          insertBtn.disabled = selected.size === 0;
        } else {
          await inject(input, [it.id]);
          close();
        }
      });
      grid.appendChild(cell);
    });

    insertBtn.addEventListener("click", async () => {
      if (selected.size === 0) return;
      await inject(input, [...selected]);
      close();
    });

    root.querySelector(".persona-x").addEventListener("click", close);
    root.querySelector(".persona-device").addEventListener("click", () => {
      close();
      bypassNext = input;
      input.click(); // re-open, this time letting the native dialog through
    });
    root.addEventListener("click", (e) => {
      if (e.target === root) close();
    });
    document.addEventListener("keydown", onKey, true);

    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    }
    function close() {
      document.removeEventListener("keydown", onKey, true);
      root.remove();
    }

    (document.body || document.documentElement).appendChild(root);
  }

  // --- put the chosen files into the input -----------------------------------
  async function inject(input, ids) {
    const dt = new DataTransfer();
    for (const id of ids) {
      const { item } = await send({ type: "get", id });
      if (!item) continue;
      const blob = await (await fetch(item.dataUrl)).blob();
      dt.items.add(new File([blob], item.name, { type: item.mime || blob.type }));
    }
    if (dt.files.length === 0) return;
    try {
      input.files = dt.files;
    } catch (_) {
      return; // some inputs forbid programmatic assignment
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }
})();
