// Tiny IndexedDB wrapper for the persona media library.
// Runs in the extension origin (background service worker + popup), so both
// share the same database. Content scripts never touch this directly — they
// talk to the background worker over messaging (see background.js / content.js).

const DB_NAME = "persona";
const DB_VERSION = 1;
const STORE = "media";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let result;
        Promise.resolve(fn(store)).then((r) => (result = r));
        t.oncomplete = () => {
          db.close();
          resolve(result);
        };
        t.onerror = () => {
          db.close();
          reject(t.error);
        };
        t.onabort = () => {
          db.close();
          reject(t.error);
        };
      })
  );
}

// Full records include the base64 data URLs of the media + its thumbnail.
const PersonaDB = {
  add(record) {
    return tx("readwrite", (store) => store.put(record));
  },
  remove(id) {
    return tx("readwrite", (store) => store.delete(id));
  },
  get(id) {
    return tx("readonly", (store) => reqToPromise(store.get(id)));
  },
  // Lightweight list for UI grids: no full-size dataUrl, only the thumbnail.
  list() {
    return tx("readonly", (store) => reqToPromise(store.getAll())).then(
      (rows) =>
        (rows || [])
          .sort((a, b) => b.addedAt - a.addedAt)
          .map(({ dataUrl, ...meta }) => meta)
    );
  },
};

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

if (typeof self !== "undefined") self.PersonaDB = PersonaDB;
