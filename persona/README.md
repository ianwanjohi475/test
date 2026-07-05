# 🎭 Persona — upload your images & videos to any site

A tiny browser extension that keeps a personal library of images and videos and
lets you drop them into **any website's upload field with one click** — no more
hunting through folders every time a site asks for a photo or video.

It works in two places:

- **On your desktop** browser (Chrome, Edge, Brave — any Chromium browser).
- **Inside the Cloud Phone's browser** — install [Kiwi Browser](https://kiwibrowser.com/)
  on the phone (it's in Aurora Store) and load this the same way; Kiwi runs
  Chrome extensions on Android.

For putting media into the phone's **native apps** (Instagram, WhatsApp, a
dating app's own picker, the camera roll…), use the companion script
[`scripts/upload-media.sh`](../scripts/upload-media.sh) instead — it copies your
files straight into the phone's gallery so every app can see them.

---

## How it works

1. You add images/videos to the library from the toolbar popup. They're stored
   locally inside the extension — nothing is uploaded anywhere.
2. On any website, when you click an **upload button / file field**, Persona
   intercepts the normal "browse your disk" dialog and shows your library.
3. Pick one (or several, if the site allows multiple) and it's injected into the
   field exactly as if you'd selected it from disk. Submit the form as usual.

There's an on/off switch in the popup. Turn it **off** and every site behaves
normally again; or use **"Use device file…"** inside the chooser to fall back to
the real file picker for a single upload.

---

## Install (desktop Chrome / Edge / Brave)

1. Go to `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and choose this `persona/` folder.
4. Pin the 🎭 icon, click it, and add a few images or videos.

That's it — visit any site with an upload field and click it.

## Install (inside the Cloud Phone)

1. On the phone, open **Aurora Store** and install **Kiwi Browser**.
2. Get this folder onto the phone as a `.zip`. Easiest:
   ```bash
   cd persona && zip -r ../persona.zip . && cd ..
   bash scripts/upload-media.sh persona.zip     # lands in the phone's files
   ```
   (or download it from anywhere into the phone's Downloads).
3. In Kiwi: **⋮ menu → Extensions → (enable Developer mode) → + (from .zip)**
   and pick `persona.zip`.
4. Tap the Kiwi menu → **Persona** to add media, then use any site normally.

> Firefox note: this is a Manifest V3 extension. Chromium browsers (including
> Kiwi on Android) load it as-is. Desktop Firefox can load it via
> `about:debugging → This Firefox → Load Temporary Add-on` (pick `manifest.json`).

---

## What's stored, and where

Everything lives on-device in the extension's own storage (IndexedDB, with the
`unlimitedStorage` permission so large videos fit). Persona has **no servers, no
analytics, and makes no network requests** — the media never leaves your
browser until *you* submit it to a site yourself.

## Notes & limits

- Works with standard `<input type="file">` fields, including the very common
  pattern of a styled button that opens a hidden file input.
- Some sites use a **drag-and-drop only** dropzone with no clickable file input;
  those can't be intercepted. Use **"Use device file…"** or the phone-gallery
  script there.
- Very large videos are held as data URLs; multi-hundred-MB files work but are
  heavier to load — trim long clips first if the popup feels slow.
