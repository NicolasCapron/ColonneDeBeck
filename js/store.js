// ── IndexedDB Store for Beck entries ──

const DB_NAME = 'beck-colonnes';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(mode, fn) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const result = fn(store);
      transaction.oncomplete = () => resolve(result.result ?? result);
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

const Store = {
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.index('date').openCursor(null, 'prev');
      const results = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  },

  async get(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const req = transaction.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async save(entry) {
    if (!entry.id) {
      entry.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(entry);
      transaction.oncomplete = () => resolve(entry);
      transaction.onerror = () => reject(transaction.error);
    });
  },

  async remove(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
};

export default Store;
