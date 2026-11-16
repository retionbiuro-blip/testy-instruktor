export type LicenseCategory = 'B' | 'A' | 'C' | 'D' | 'T' | 'TRAM' | 'ALL';

export type LicenseCategoryFilter = 'B' | 'A' | 'C' | 'D' | 'T' | 'TRAM' | 'ALL_LICENSES';

export interface Question {
  id: string;
  questionHash: string;
  category: string;
  licenseCategory?: LicenseCategory;
  question: string;
  options: string[];
  correctAnswers: number[]; // Indeksy od 0 (np. [0] lub [0, 2])
  imageBase64?: string;
  hasImagePlaceholder: boolean;
  wrongCount?: number;
  explanation?: string;
  importBatchId?: string;
  importBatchLabel?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Lesson {
  id: string;
  category: string;
  title: string;
  order: number;
  legalBasis: string;
  content: string;
  keyTakeaways: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type LegalActType = 'ustawa' | 'rozporzadzenie' | 'inne';

export interface LegalAct {
  id: string;
  title: string;
  type: LegalActType;
  description: string;
  url: string;
  order: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SystemMetadata {
  dbVersion: number;
  categories: string[];
  notebookLmUrl?: string;
  updatedAt?: unknown;
}

export interface CommentItem {
  id: string;
  questionId: string;
  authorNick: string;
  authorUid: string;
  text: string;
  createdAt: Date | null;
}

export interface ReportItem {
  id: string;
  questionId: string;
  questionText: string;
  category: string;
  userId: string;
  userNick: string;
  reason: string;
  status: 'open' | 'resolved';
  adminReply: string | null;
  repliedAt: Date | null;
  isReadByUser: boolean;
  createdAt: Date | null;
}

export interface ExamHistoryItem {
  id: string;
  mode: 'exam' | 'quick10';
  category: string;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  dateIso: string;
}

export interface UserProgress {
  uid: string;
  nick: string;
  email: string;
  masteredIds: string[];
  completedLessonIds?: string[];
  // Klucz: questionId, Wartość: liczba kolejnych poprawnych odpowiedzi w trybie powtórki (znika przy 2)
  mistakeStreaks: Record<string, number>;
  askLecturerIds: string[];
  privateNotes: Record<string, string>;
  totalAnswered: number;
  totalCorrect: number;
  points: number;
  streakDays: number;
  lastStudyDate?: string; // YYYY-MM-DD
  examHistory?: ExamHistoryItem[];
  unreadNotifications?: number;
  updatedAt?: unknown;
}

export interface LeaderboardEntry {
  uid: string;
  nick: string;
  masteredCount: number;
  points: number;
  streakDays: number;
  accuracy: number;
  updatedAt?: unknown;
}

export type AppView =
  | 'dashboard'
  | 'knowledge'
  | 'legal-acts'
  | 'study'
  | 'mistakes'
  | 'lecturer'
  | 'exam'
  | 'quick10'
  | 'leaderboard'
  | 'admin';

export interface ParsedQuestionInput {
  category: string;
  licenseCategory?: LicenseCategory;
  question: string;
  options: string[];
  correctAnswers: number[];
  hasImagePlaceholder: boolean;
  explanation?: string;
  imageBase64?: string;
  questionHash: string;
}
