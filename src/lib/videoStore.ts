/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// IndexedDB Helper to permanently store video files locally in browser storage
// Bypasses ephemeral server container disk restarts and Firestore size limits

const DB_NAME = "WollyVideoDB";
const STORE_NAME = "videos";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event: any) => {
      resolve(event.target.result);
    };

    request.onerror = (event: any) => {
      reject(event.target.error);
    };
  });
}

/**
 * Save a video Blob or Data URL to IndexedDB for offline and cross-session persistence
 */
export async function saveVideoToIndexedDB(key: string, data: Blob | string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(data, key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[VIDEO_STORE] Error saving video to IndexedDB:", err);
  }
}

/**
 * Retrieve a stored video from IndexedDB and return an Object URL or Data URL
 */
export async function getVideoFromIndexedDB(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        if (result instanceof Blob) {
          const objectUrl = URL.createObjectURL(result);
          resolve(objectUrl);
        } else if (typeof result === "string") {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn("[VIDEO_STORE] Error retrieving video from IndexedDB:", err);
    return null;
  }
}

/**
 * Delete a video from IndexedDB
 */
export async function deleteVideoFromIndexedDB(key: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
  } catch (err) {
    console.warn("[VIDEO_STORE] Error deleting video from IndexedDB:", err);
  }
}
