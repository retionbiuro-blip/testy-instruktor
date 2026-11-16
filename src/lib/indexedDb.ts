import { ExamTopic, GlossaryTerm, LegalAct, Lesson, Question } from '../types';

const DB_NAME = 'instruktor_pro_db';
const DB_VERSION = 5;
const STORE_QUESTIONS = 'questions';
const STORE_LESSONS = 'lessons';
const STORE_LEGAL_ACTS = 'legalActs';
const STORE_EXAM_TOPICS = 'examTopics';
const STORE_GLOSSARY_TERMS = 'glossaryTerms';
const LOCAL_VERSION_KEY = 'instruktor_db_version';
const LOCAL_LESSONS_VERSION_KEY = 'instruktor_lessons_db_version';
const LOCAL_LEGAL_ACTS_VERSION_KEY = 'instruktor_legal_acts_db_version';
const LOCAL_EXAM_TOPICS_VERSION_KEY = 'instruktor_exam_topics_db_version';
const LOCAL_GLOSSARY_TERMS_VERSION_KEY = 'instruktor_glossary_terms_db_version';
const THEME_STORAGE_KEY = 'instruktor_theme';
const LAST_BULK_IMAGE_BATCH_KEY = 'instruktor_last_bulk_image_batch';

export interface LastBulkImageBatch {
  questionIds: string[];
  savedAtIso: string;
}

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
      if (!db.objectStoreNames.contains(STORE_LESSONS)) {
        db.createObjectStore(STORE_LESSONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_LEGAL_ACTS)) {
        db.createObjectStore(STORE_LEGAL_ACTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_EXAM_TOPICS)) {
        db.createObjectStore(STORE_EXAM_TOPICS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_GLOSSARY_TERMS)) {
        db.createObjectStore(STORE_GLOSSARY_TERMS, { keyPath: 'id' });
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
    console.warn('Odczyt pytań z IndexedDB nie powiódł się:', err);
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
    tx.onerror = () => reject(tx.error ?? new Error('Błąd zapisu pytań do IndexedDB'));
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

export async function getCachedLessons(): Promise<Lesson[]> {
  try {
    const db = await openDatabase();
    return await new Promise<Lesson[]>((resolve, reject) => {
      const tx = db.transaction(STORE_LESSONS, 'readonly');
      const store = tx.objectStore(STORE_LESSONS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as Lesson[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Odczyt lekcji z IndexedDB nie powiódł się:', err);
    return [];
  }
}

export async function saveLessonsToCache(lessons: Lesson[]): Promise<void> {
  const db = await openDatabase();
  return await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_LESSONS, 'readwrite');
    const store = tx.objectStore(STORE_LESSONS);
    store.clear();
    for (const lesson of lessons) {
      store.put(lesson);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Błąd zapisu lekcji do IndexedDB'));
  });
}

export function getLocalLessonsDbVersion(): number {
  const raw = localStorage.getItem(LOCAL_LESSONS_VERSION_KEY);
  const parsed = raw ? Number(raw) : -1;
  return Number.isFinite(parsed) ? parsed : -1;
}

export function setLocalLessonsDbVersion(version: number): void {
  localStorage.setItem(LOCAL_LESSONS_VERSION_KEY, String(version));
}

export async function getCachedLegalActs(): Promise<LegalAct[]> {
  try {
    const db = await openDatabase();
    return await new Promise<LegalAct[]>((resolve, reject) => {
      const tx = db.transaction(STORE_LEGAL_ACTS, 'readonly');
      const store = tx.objectStore(STORE_LEGAL_ACTS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as LegalAct[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Odczyt aktów prawnych z IndexedDB nie powiódł się:', err);
    return [];
  }
}

export async function saveLegalActsToCache(acts: LegalAct[]): Promise<void> {
  const db = await openDatabase();
  return await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_LEGAL_ACTS, 'readwrite');
    const store = tx.objectStore(STORE_LEGAL_ACTS);
    store.clear();
    for (const act of acts) {
      store.put(act);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Błąd zapisu aktów prawnych do IndexedDB'));
  });
}

export function getLocalLegalActsDbVersion(): number {
  const raw = localStorage.getItem(LOCAL_LEGAL_ACTS_VERSION_KEY);
  const parsed = raw ? Number(raw) : -1;
  return Number.isFinite(parsed) ? parsed : -1;
}

export function setLocalLegalActsDbVersion(version: number): void {
  localStorage.setItem(LOCAL_LEGAL_ACTS_VERSION_KEY, String(version));
}

export async function getCachedExamTopics(): Promise<ExamTopic[]> {
  try {
    const db = await openDatabase();
    return await new Promise<ExamTopic[]>((resolve, reject) => {
      const tx = db.transaction(STORE_EXAM_TOPICS, 'readonly');
      const store = tx.objectStore(STORE_EXAM_TOPICS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as ExamTopic[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Odczyt tematów egzaminacyjnych z IndexedDB nie powiódł się:', err);
    return [];
  }
}

export async function saveExamTopicsToCache(topics: ExamTopic[]): Promise<void> {
  const db = await openDatabase();
  return await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_EXAM_TOPICS, 'readwrite');
    const store = tx.objectStore(STORE_EXAM_TOPICS);
    store.clear();
    for (const topic of topics) {
      store.put(topic);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error('Błąd zapisu tematów egzaminacyjnych do IndexedDB'));
  });
}

export function getLocalExamTopicsDbVersion(): number {
  const raw = localStorage.getItem(LOCAL_EXAM_TOPICS_VERSION_KEY);
  const parsed = raw ? Number(raw) : -1;
  return Number.isFinite(parsed) ? parsed : -1;
}

export function setLocalExamTopicsDbVersion(version: number): void {
  localStorage.setItem(LOCAL_EXAM_TOPICS_VERSION_KEY, String(version));
}

export async function getCachedGlossaryTerms(): Promise<GlossaryTerm[]> {
  try {
    const db = await openDatabase();
    return await new Promise<GlossaryTerm[]>((resolve, reject) => {
      const tx = db.transaction(STORE_GLOSSARY_TERMS, 'readonly');
      const store = tx.objectStore(STORE_GLOSSARY_TERMS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as GlossaryTerm[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Odczyt słownika fiszek z IndexedDB nie powiódł się:', err);
    return [];
  }
}

export async function saveGlossaryTermsToCache(terms: GlossaryTerm[]): Promise<void> {
  const db = await openDatabase();
  return await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_GLOSSARY_TERMS, 'readwrite');
    const store = tx.objectStore(STORE_GLOSSARY_TERMS);
    store.clear();
    for (const term of terms) {
      store.put(term);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error('Błąd zapisu słownika fiszek do IndexedDB'));
  });
}

export function getLocalGlossaryTermsDbVersion(): number {
  const raw = localStorage.getItem(LOCAL_GLOSSARY_TERMS_VERSION_KEY);
  const parsed = raw ? Number(raw) : -1;
  return Number.isFinite(parsed) ? parsed : -1;
}

export function setLocalGlossaryTermsDbVersion(version: number): void {
  localStorage.setItem(LOCAL_GLOSSARY_TERMS_VERSION_KEY, String(version));
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

export function getLastBulkImageBatch(): LastBulkImageBatch | null {
  try {
    const raw = localStorage.getItem(LAST_BULK_IMAGE_BATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastBulkImageBatch>;
    if (!Array.isArray(parsed.questionIds) || parsed.questionIds.length === 0) return null;
    return {
      questionIds: parsed.questionIds.filter((id): id is string => typeof id === 'string'),
      savedAtIso: typeof parsed.savedAtIso === 'string' ? parsed.savedAtIso : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function saveLastBulkImageBatch(questionIds: string[]): LastBulkImageBatch {
  const payload: LastBulkImageBatch = {
    questionIds,
    savedAtIso: new Date().toISOString()
  };
  localStorage.setItem(LAST_BULK_IMAGE_BATCH_KEY, JSON.stringify(payload));
  return payload;
}

export function clearLastBulkImageBatch(): void {
  localStorage.removeItem(LAST_BULK_IMAGE_BATCH_KEY);
}
