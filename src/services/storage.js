const DB_NAME = 'hamro-byapar';
const STORE = 'app-data';
const FALLBACK = 'hamro-byapar-data';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.objectStoreNames.contains(STORE) || request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadData() {
  try {
    const db = await openDb();
    const value = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get('state');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  } catch { try { return JSON.parse(localStorage.getItem(FALLBACK)); } catch { return null; } }
}

export async function saveData(value) {
  localStorage.setItem(FALLBACK, JSON.stringify(value));
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, 'state');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* LocalStorage keeps an offline fallback. */ }
}
