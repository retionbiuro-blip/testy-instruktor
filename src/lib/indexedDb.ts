import { Question } from '../types';

const DB_NAME = 'instruktor_pro_db';
const DB_VERSION = 1;
const STORE_QUESTIONS = 'questions';
const LOCAL_VERSION_KEY = 'instruktor_db_version';
const THEME_STORAGE_KEY = 'instruktor_theme';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB nie jest obsługiwane w tej przeglądarce.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
        db.createObjectStore(STORE_QUESTIONS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Błąd otwarcia IndexedDB'));
  });
}

export async function getCachedQuestions(): Promise<Question[]> {
  try {
    const db = await openDatabase();
    return await new Promise<Question[]>((resolve, reject) => {
      const tx = db.transaction(STORE_QUESTIONS, 'readonly');
      const store = tx.objectStore(STORE_QUESTIONS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as Question[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Odczyt z IndexedDB nie powiódł się:', err);
    return [];
  }
}

export async function saveQuestionsToCache(questions: Question[]): Promise<void> {
  const db = await openDatabase();
  return await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUESTIONS, 'readwrite');
    const store = tx.objectStore(STORE_QUESTIONS);
    store.clear();
    for (const q of questions) {
      store.put(q);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Błąd zapisu do IndexedDB'));
  });
}

export async function clearQuestionsCache(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_QUESTIONS, 'readwrite');
      const store = tx.objectStore(STORE_QUESTIONS);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Czyszczenie IndexedDB nie powiodło się:', err);
  }
  localStorage.removeItem(LOCAL_VERSION_KEY);
}

export function getLocalDbVersion(): number {
  const raw = localStorage.getItem(LOCAL_VERSION_KEY);
  const parsed = raw ? Number(raw) : -1;
  return Number.isFinite(parsed) ? parsed : -1;
}

export function setLocalDbVersion(version: number): void {
  localStorage.setItem(LOCAL_VERSION_KEY, String(version));
}

export function getStoredTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
