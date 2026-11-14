import appletConfig from '../firebase-applet-config.json';

/**
 * ============================================================================
 * KONFIGURACJA ADMINISTRATORA I FIREBASE (TUTAJ WPROWADŹ SWOJE DANE)
 * ============================================================================
 */

// 1. Wpisz swój adres e-mail administratora.
// Osoba zalogowana tym adresem automatycznie zobaczy przycisk "Panel Admina".
// WAŻNE: Ten sam adres e-mail wpisz również w pliku firestore.rules (funkcja isAdmin).
export const ADMIN_EMAIL = 'retion.biuro@gmail.com';

// 2. Jeśli przenosisz aplikację na WŁASNY projekt Firebase (np. na Netlify):
// Odkomentuj poniższy obiekt MANUAL_FIREBASE_CONFIG i wklej swoje klucze
// skopiowane z konsoli Firebase (Ustawienia projektu -> Twoje aplikacje -> Aplikacja webowa).
// Gdy MANUAL_FIREBASE_CONFIG ma wartość null, aplikacja korzysta z pliku firebase-applet-config.json.
export interface FirebaseConfigShape {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export const MANUAL_FIREBASE_CONFIG: FirebaseConfigShape | null = null;
/*
export const MANUAL_FIREBASE_CONFIG: FirebaseConfigShape | null = {
  apiKey: "WKLEJ_TUTAJ_API_KEY",
  authDomain: "TWOJ-PROJEKT.firebaseapp.com",
  projectId: "TWOJ-PROJEKT",
  storageBucket: "TWOJ-PROJEKT.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
*/

export const ACTIVE_FIREBASE_CONFIG: FirebaseConfigShape =
  MANUAL_FIREBASE_CONFIG ?? appletConfig;

export const USES_CUSTOM_DATABASE_ID =
  !MANUAL_FIREBASE_CONFIG && Boolean(appletConfig.firestoreDatabaseId);

// --- STAŁE APLIKACJI ---
export const DEFAULT_CATEGORIES: string[] = [
  'Prawo o ruchu drogowym',
  'Dydaktyka',
  'Psychologia',
  'Technika kierowania',
  'Pierwsza pomoc',
  'Ogólne / Mix'
];

export const ALL_CATEGORIES_KEY = '__ALL_MIX__';
export const ALL_CATEGORIES_LABEL = 'Wszystkie kategorie (Mix)';

export const EXAM_PASS_THRESHOLD_PERCENT = 85;
export const EXAM_DURATION_SECONDS = 25 * 60; // 25 minut
export const QUICK10_QUESTION_COUNT = 10;
export const QUICK10_DURATION_SECONDS = 3 * 60; // 3 minuty
export const MISTAKE_CLEAR_STREAK = 2; // 2 poprawne odpowiedzi z rzędu usuwają z puli błędów
export const FIRESTORE_BATCH_LIMIT = 400; // Maksymalnie 400 operacji w jednej paczce
