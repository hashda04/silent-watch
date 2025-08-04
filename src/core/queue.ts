const DB_NAME = 'silent-watch-queue';
const STORE_NAME = 'events';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueEvent(event: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(event);
  } catch {
    console.warn('[SilentWatch Queue] failed to enqueue, dropping event');
  }
}

export async function drainQueue(flushFn: (ev: any[]) => Promise<void>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const all: Array<{ key: any; value: any }> = await new Promise((resolve) => {
      const cursorReq = store.openCursor();
      const items: Array<{ key: any; value: any }> = [];
      cursorReq.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          items.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        } else {
          resolve(items);
        }
      };
      cursorReq.onerror = () => resolve([]);
    });

    if (all.length === 0) return;

    try {
      await flushFn(all.map((x) => x.value));
      const delTx = db.transaction(STORE_NAME, 'readwrite');
      const delStore = delTx.objectStore(STORE_NAME);
      all.forEach((x) => delStore.delete(x.key));
    } catch (e) {
      console.warn('[SilentWatch Queue] flush failed, will retry', e);
    }
  } catch (e) {
    console.warn('[SilentWatch Queue] drain failed', e);
  }
}
