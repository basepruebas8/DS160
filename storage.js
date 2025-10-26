// storage.js
// Expone window.DS160 con:
// - imageStore: saveImages(files, onProgress), listImages(), getRecord(id), deleteImage(id)
// - exportAll(): { meta, forms, images[] }  (images con base64)
// - downloadJSON(payload?, filename?)
(() => {
  const DB_NAME = 'ds160-db';
  const DB_VERSION = 1;
  const STORE_IMAGES = 'images';
  const STORAGE_PREFIX = 'ds160:';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_IMAGES)) {
          const st = db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
          st.createIndex('by_name', 'name', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function txPromise(db, store, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const st = tx.objectStore(store);
      fn(st, tx);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function saveImages(files, onProgress) {
    const db = await openDB();
    const arr = Array.from(files);
    let i = 0;
    for (const file of arr) {
      const id = crypto.randomUUID();
      const buf = await file.arrayBuffer();
      await txPromise(db, STORE_IMAGES, 'readwrite', (st) => {
        st.put({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified || Date.now(),
          data: buf
        });
      });
      i++;
      if (onProgress) onProgress(i / arr.length);
    }
  }

  async function listImages() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readonly');
      const st = tx.objectStore(STORE_IMAGES);
      const res = [];
      const req = st.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const { id, name, type, size, lastModified } = cursor.value;
          res.push({ id, name, type, size, lastModified });
          cursor.continue();
        } else {
          resolve(res);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getRecord(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_IMAGES, 'readonly');
      const st = tx.objectStore(STORE_IMAGES);
      const req = st.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteImage(id) {
    const db = await openDB();
    return txPromise(db, STORE_IMAGES, 'readwrite', st => st.delete(id));
  }

  function arrayBufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const sub = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode.apply(null, sub);
    }
    return btoa(binary);
  }

  function collectFormsFromLocalStorage() {
    const forms = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(STORAGE_PREFIX)) continue;
      // Formato: ds160:<FORM_ID>:<FIELD>
      const rest = k.substring(STORAGE_PREFIX.length);
      const firstColon = rest.indexOf(':');
      if (firstColon === -1) continue;
      const formId = rest.substring(0, firstColon);
      const field = rest.substring(firstColon + 1);
      const val = localStorage.getItem(k);
      if (!forms[formId]) forms[formId] = {};
      // Normaliza booleanos "1"/"0" para checkboxes
      forms[formId][field] = (val === '1' || val === '0') ? (val === '1') : val;
    }
    return forms;
  }

  async function exportAll() {
    const forms = collectFormsFromLocalStorage();
    const meta = {
      exportedAt: new Date().toISOString(),
      version: 1,
      pagesExpected: 16
    };
    const imgs = await (async () => {
      const list = await listImages();
      const out = [];
      for (const meta of list) {
        const rec = await getRecord(meta.id);
        const b64 = arrayBufferToBase64(rec.data);
        out.push({
          id: rec.id,
          name: rec.name,
          type: rec.type,
          size: rec.size,
          lastModified: rec.lastModified,
          dataURI: `data:${rec.type || 'application/octet-stream'};base64,${b64}`
        });
      }
      return out;
    })();
    return { meta, forms, images: imgs };
  }

  function downloadJSON(payload, filename) {
    const data = payload ? JSON.stringify(payload, null, 2) : '{}';
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `DS-160_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  window.DS160 = {
    imageStore: { saveImages, listImages, getRecord, deleteImage },
    exportAll,
    downloadJSON
  };
})();
