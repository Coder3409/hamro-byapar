const DB_NAME = 'hamro-byapar';
const STORE = 'app-data';
const FALLBACK = 'hamro-byapar-data';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.objectStoreNames.contains(STORE) || request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    // Timeout fallback if IndexedDB is blocked (private browsing, storage disabled, etc.)
    setTimeout(() => reject(new Error('IndexedDB timeout')), 3000);
  });
}

export async function loadData() {
  try {
    const db = await openDb();
    const value = await Promise.race([
      new Promise((resolve, reject) => {
        const request = db.transaction(STORE, 'readonly').objectStore(STORE).get('state');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB read timeout')), 2000))
    ]);
    db.close();
    return value;
  } catch {
    try { return JSON.parse(localStorage.getItem(FALLBACK)); } catch { return null; }
  }
}

export async function saveData(value) {
  localStorage.setItem(FALLBACK, JSON.stringify(value));
  try {
    const db = await openDb();
    await Promise.race([
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, 'state');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB write timeout')), 2000))
    ]);
    db.close();
  } catch { /* LocalStorage keeps an offline fallback. */ }
}
