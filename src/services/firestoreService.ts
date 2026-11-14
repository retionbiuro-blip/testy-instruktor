import { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import {
  DEFAULT_CATEGORIES,
  FIRESTORE_BATCH_LIMIT,
  MISTAKE_CLEAR_STREAK
} from '../config';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import {
  getCachedQuestions,
  getLocalDbVersion,
  saveQuestionsToCache,
  setLocalDbVersion
} from '../lib/indexedDb';
import {
  generateQuestionId,
  getTodayLocalIsoDate,
  getYesterdayLocalIsoDate
} from '../lib/questionUtils';
import {
  CommentItem,
  ExamHistoryItem,
  LeaderboardEntry,
  ParsedQuestionInput,
  Question,
  ReportItem,
  SystemMetadata,
  UserProgress
} from '../types';

const METADATA_DOC_REF = doc(db, 'system', 'metadata');

function timestampToDate(val: unknown): Date | null {
  if (val instanceof Timestamp) return val.toDate();
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  return null;
}

function buildCleanQuestionPayload(q: Question, includeCreatedAt = false): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: q.id,
    questionHash: q.questionHash,
    category: q.category,
    question: q.question,
    options: q.options,
    correctAnswers: q.correctAnswers,
    hasImagePlaceholder: Boolean(q.hasImagePlaceholder),
    updatedAt: serverTimestamp()
  };
  if (includeCreatedAt) {
    payload.createdAt = serverTimestamp();
  } else if (q.createdAt) {
    payload.createdAt = q.createdAt;
  }
  if (q.imageBase64) {
    payload.imageBase64 = q.imageBase64;
  }
  if (q.explanation && q.explanation.trim()) {
    payload.explanation = q.explanation.trim();
  }
  return payload;
}

/**
 * Odczytuje wyłącznie 1 dokument system/metadata.
 * Pobiera pełną kolekcję questions z Firestore TYLKO wtedy, gdy:
 * - dbVersion na serwerze > dbVersion w localStorage, LUB
 * - IndexedDB jest puste (a na serwerze mogą być pytania).
 */
export async function syncQuestionsWithCache(
  isAdmin: boolean,
  forceServerFetch = false
): Promise<{
  questions: Question[];
  metadata: SystemMetadata;
  syncedFromServer: boolean;
}> {
  let metadata: SystemMetadata = {
    dbVersion: 0,
    categories: DEFAULT_CATEGORIES
  };

  try {
    const metaSnap = await getDoc(METADATA_DOC_REF);
    if (metaSnap.exists()) {
      const data = metaSnap.data();
      metadata = {
        dbVersion: typeof data.dbVersion === 'number' ? data.dbVersion : 0,
        categories:
          Array.isArray(data.categories) && data.categories.length > 0
            ? (data.categories as string[])
            : DEFAULT_CATEGORIES,
        updatedAt: data.updatedAt
      };
    } else if (isAdmin) {
      // Pierwsze uruchomienie przez admina: inicjalizujemy system/metadata
      await setDoc(METADATA_DOC_REF, {
        dbVersion: 1,
        categories: DEFAULT_CATEGORIES,
        updatedAt: serverTimestamp()
      });
      metadata = { dbVersion: 1, categories: DEFAULT_CATEGORIES };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'system/metadata');
  }

  const localVersion = getLocalDbVersion();
  const cachedQuestions = await getCachedQuestions();

  const needsSync =
    forceServerFetch ||
    localVersion < 0 ||
    metadata.dbVersion > localVersion ||
    (cachedQuestions.length === 0 && metadata.dbVersion > 0);

  if (!needsSync) {
    return {
      questions: cachedQuestions,
      metadata,
      syncedFromServer: false
    };
  }

  try {
    const snapshot = await getDocs(collection(db, 'questions'));
    const freshQuestions: Question[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id ?? d.id),
        questionHash: String(data.questionHash ?? ''),
        category: String(data.category ?? 'Ogólne / Mix'),
        question: String(data.question ?? ''),
        options: Array.isArray(data.options) ? (data.options as string[]) : [],
        correctAnswers: Array.isArray(data.correctAnswers) ? (data.correctAnswers as number[]) : [0],
        imageBase64: typeof data.imageBase64 === 'string' ? data.imageBase64 : undefined,
        hasImagePlaceholder: Boolean(data.hasImagePlaceholder),
        explanation: typeof data.explanation === 'string' ? data.explanation : undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });

    await saveQuestionsToCache(freshQuestions);
    setLocalDbVersion(metadata.dbVersion);

    return {
      questions: freshQuestions,
      metadata,
      syncedFromServer: true
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'questions');
  }
}

async function bumpDatabaseVersion(
  nextCategories?: string[],
  knownCurrentVersion?: number
): Promise<number> {
  let currentVersion = knownCurrentVersion ?? 0;
  let categories = nextCategories ?? DEFAULT_CATEGORIES;

  try {
    const snap = await getDoc(METADATA_DOC_REF);
    if (snap.exists()) {
      const data = snap.data();
      currentVersion = typeof data.dbVersion === 'number' ? data.dbVersion : currentVersion;
      if (!nextCategories && Array.isArray(data.categories) && data.categories.length > 0) {
        categories = data.categories as string[];
      }
    }
    const nextVersion = currentVersion + 1;
    await setDoc(METADATA_DOC_REF, {
      dbVersion: nextVersion,
      categories,
      updatedAt: serverTimestamp()
    });
    return nextVersion;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'system/metadata');
  }
}

// --- POSTĘPY KURSANTA I RANKING ---

export async function loadOrCreateUserProgress(
  user: User,
  preferredNick?: string
): Promise<UserProgress> {
  const userRef = doc(db, 'users', user.uid);
  const leaderboardRef = doc(db, 'leaderboard', user.uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const progress: UserProgress = {
        uid: user.uid,
        nick: String(data.nick || preferredNick || user.displayName || 'Kursant'),
        email: String(data.email || user.email || ''),
        masteredIds: Array.isArray(data.masteredIds) ? (data.masteredIds as string[]) : [],
        mistakeStreaks:
          data.mistakeStreaks && typeof data.mistakeStreaks === 'object'
            ? (data.mistakeStreaks as Record<string, number>)
            : {},
        askLecturerIds: Array.isArray(data.askLecturerIds) ? (data.askLecturerIds as string[]) : [],
        privateNotes:
          data.privateNotes && typeof data.privateNotes === 'object'
            ? (data.privateNotes as Record<string, string>)
            : {},
        totalAnswered: typeof data.totalAnswered === 'number' ? data.totalAnswered : 0,
        totalCorrect: typeof data.totalCorrect === 'number' ? data.totalCorrect : 0,
        points: typeof data.points === 'number' ? data.points : 0,
        streakDays: typeof data.streakDays === 'number' ? data.streakDays : 0,
        lastStudyDate: typeof data.lastStudyDate === 'string' ? data.lastStudyDate : '',
        examHistory: Array.isArray(data.examHistory) ? (data.examHistory as ExamHistoryItem[]) : []
      };
      return progress;
    }

    const nick = (preferredNick || user.displayName || user.email?.split('@')[0] || 'Kursant')
      .trim()
      .slice(0, 60);

    const initialProgress: UserProgress = {
      uid: user.uid,
      nick: nick.length >= 2 ? nick : 'Kursant',
      email: user.email || '',
      masteredIds: [],
      mistakeStreaks: {},
      askLecturerIds: [],
      privateNotes: {},
      totalAnswered: 0,
      totalCorrect: 0,
      points: 0,
      streakDays: 0,
      lastStudyDate: '',
      examHistory: []
    };

    await setDoc(userRef, {
      ...initialProgress,
      updatedAt: serverTimestamp()
    });

    await setDoc(leaderboardRef, {
      uid: user.uid,
      nick: initialProgress.nick,
      masteredCount: 0,
      points: 0,
      streakDays: 0,
      accuracy: 0,
      updatedAt: serverTimestamp()
    });

    return initialProgress;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

async function persistUserAndLeaderboard(progress: UserProgress): Promise<void> {
  const userRef = doc(db, 'users', progress.uid);
  const leaderboardRef = doc(db, 'leaderboard', progress.uid);

  const accuracy =
    progress.totalAnswered > 0
      ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
      : 0;

  try {
    await setDoc(userRef, {
      uid: progress.uid,
      nick: progress.nick,
      email: progress.email,
      masteredIds: progress.masteredIds.slice(0, 10000),
      mistakeStreaks: progress.mistakeStreaks,
      askLecturerIds: progress.askLecturerIds.slice(0, 5000),
      privateNotes: progress.privateNotes,
      totalAnswered: progress.totalAnswered,
      totalCorrect: progress.totalCorrect,
      points: progress.points,
      streakDays: progress.streakDays,
      lastStudyDate: progress.lastStudyDate ?? '',
      examHistory: (progress.examHistory ?? []).slice(-100),
      updatedAt: serverTimestamp()
    });

    await setDoc(leaderboardRef, {
      uid: progress.uid,
      nick: progress.nick,
      masteredCount: progress.masteredIds.length,
      points: progress.points,
      streakDays: progress.streakDays,
      accuracy,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${progress.uid}`);
  }
}

export function computeNextStreak(currentStreak: number, lastStudyDate?: string): {
  streakDays: number;
  lastStudyDate: string;
} {
  const today = getTodayLocalIsoDate();
  if (lastStudyDate === today) {
    return { streakDays: Math.max(1, currentStreak), lastStudyDate: today };
  }
  const yesterday = getYesterdayLocalIsoDate();
  if (lastStudyDate === yesterday) {
    return { streakDays: currentStreak + 1, lastStudyDate: today };
  }
  return { streakDays: 1, lastStudyDate: today };
}

export async function recordAnswerProgress(
  current: UserProgress,
  questionId: string,
  isCorrect: boolean
): Promise<UserProgress> {
  const masteredSet = new Set(current.masteredIds);
  const nextMistakeStreaks = { ...current.mistakeStreaks };
  let earnedPoints = 0;

  if (isCorrect) {
    masteredSet.add(questionId);
    earnedPoints = 10;

    if (questionId in nextMistakeStreaks) {
      const nextStreak = (nextMistakeStreaks[questionId] ?? 0) + 1;
      if (nextStreak >= MISTAKE_CLEAR_STREAK) {
        delete nextMistakeStreaks[questionId];
        earnedPoints += 5; // Bonus za opanowanie błędu (2 poprawne z rzędu)
      } else {
        nextMistakeStreaks[questionId] = nextStreak;
      }
    }
  } else {
    masteredSet.delete(questionId);
    // Błędna odpowiedź automatycznie trafia do puli "Powtórka błędów" z licznikiem 0
    nextMistakeStreaks[questionId] = 0;
  }

  const streakUpdate = computeNextStreak(current.streakDays, current.lastStudyDate);

  const updated: UserProgress = {
    ...current,
    masteredIds: Array.from(masteredSet),
    mistakeStreaks: nextMistakeStreaks,
    totalAnswered: current.totalAnswered + 1,
    totalCorrect: current.totalCorrect + (isCorrect ? 1 : 0),
    points: current.points + earnedPoints,
    streakDays: streakUpdate.streakDays,
    lastStudyDate: streakUpdate.lastStudyDate
  };

  await persistUserAndLeaderboard(updated);
  return updated;
}

export async function toggleAskLecturer(
  current: UserProgress,
  questionId: string
): Promise<UserProgress> {
  const set = new Set(current.askLecturerIds);
  if (set.has(questionId)) {
    set.delete(questionId);
  } else {
    set.add(questionId);
  }
  const updated: UserProgress = {
    ...current,
    askLecturerIds: Array.from(set)
  };
  await persistUserAndLeaderboard(updated);
  return updated;
}

export async function savePrivateNote(
  current: UserProgress,
  questionId: string,
  note: string
): Promise<UserProgress> {
  const nextNotes = { ...current.privateNotes };
  const trimmed = note.trim();
  if (trimmed) {
    nextNotes[questionId] = trimmed.slice(0, 2000);
  } else {
    delete nextNotes[questionId];
  }
  const updated: UserProgress = {
    ...current,
    privateNotes: nextNotes
  };
  await persistUserAndLeaderboard(updated);
  return updated;
}

export async function saveExamCompletion(
  current: UserProgress,
  examItem: ExamHistoryItem,
  mistakeQuestionIds: string[],
  masteredQuestionIds: string[]
): Promise<UserProgress> {
  const masteredSet = new Set(current.masteredIds);
  const nextMistakeStreaks = { ...current.mistakeStreaks };

  for (const id of masteredQuestionIds) {
    masteredSet.add(id);
  }
  for (const id of mistakeQuestionIds) {
    masteredSet.delete(id);
    nextMistakeStreaks[id] = 0;
  }

  const streakUpdate = computeNextStreak(current.streakDays, current.lastStudyDate);
  const examBonus = examItem.passed ? 50 : 15;

  const updated: UserProgress = {
    ...current,
    masteredIds: Array.from(masteredSet),
    mistakeStreaks: nextMistakeStreaks,
    totalAnswered: current.totalAnswered + examItem.total,
    totalCorrect: current.totalCorrect + examItem.score,
    points: current.points + examItem.score * 10 + examBonus,
    streakDays: streakUpdate.streakDays,
    lastStudyDate: streakUpdate.lastStudyDate,
    examHistory: [...(current.examHistory ?? []), examItem].slice(-50)
  };

  await persistUserAndLeaderboard(updated);
  return updated;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const q = query(collection(db, 'leaderboard'), orderBy('points', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid ?? d.id),
        nick: String(data.nick ?? 'Kursant'),
        masteredCount: typeof data.masteredCount === 'number' ? data.masteredCount : 0,
        points: typeof data.points === 'number' ? data.points : 0,
        streakDays: typeof data.streakDays === 'number' ? data.streakDays : 0,
        accuracy: typeof data.accuracy === 'number' ? data.accuracy : 0
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'leaderboard');
  }
}

// --- KOMENTARZE GRUPY (kolekcja comments) ---

export async function fetchCommentsForQuestion(questionId: string): Promise<CommentItem[]> {
  try {
    const q = query(collection(db, 'comments'), where('questionId', '==', questionId));
    const snap = await getDocs(q);
    const list: CommentItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        questionId: String(data.questionId ?? questionId),
        authorNick: String(data.authorNick ?? 'Kursant'),
        authorUid: String(data.authorUid ?? ''),
        text: String(data.text ?? ''),
        createdAt: timestampToDate(data.createdAt)
      };
    });
    return list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'comments');
  }
}

export async function addCommentForQuestion(
  questionId: string,
  authorUid: string,
  authorNick: string,
  text: string
): Promise<void> {
  const newRef = doc(collection(db, 'comments'));
  try {
    await setDoc(newRef, {
      questionId,
      authorUid,
      authorNick: authorNick.slice(0, 60),
      text: text.trim().slice(0, 1500),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `comments/${newRef.id}`);
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `comments/${commentId}`);
  }
}

// --- ZGŁOSZENIA BŁĘDÓW (kolekcja reports) ---

export async function submitReport(
  question: Question,
  reporterUid: string,
  reporterNick: string,
  reason: string
): Promise<void> {
  const newRef = doc(collection(db, 'reports'));
  try {
    await setDoc(newRef, {
      questionId: question.id,
      questionSnippet: question.question.slice(0, 280),
      category: question.category.slice(0, 120),
      reporterUid,
      reporterNick: reporterNick.slice(0, 60),
      reason: reason.trim().slice(0, 1000),
      status: 'open',
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reports/${newRef.id}`);
  }
}

export async function fetchReports(): Promise<ReportItem[]> {
  try {
    const snap = await getDocs(collection(db, 'reports'));
    const items: ReportItem[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        questionId: String(data.questionId ?? ''),
        questionSnippet: String(data.questionSnippet ?? ''),
        category: String(data.category ?? ''),
        reporterUid: String(data.reporterUid ?? ''),
        reporterNick: String(data.reporterNick ?? 'Kursant'),
        reason: String(data.reason ?? ''),
        status: data.status === 'resolved' ? 'resolved' : 'open',
        createdAt: timestampToDate(data.createdAt)
      };
    });
    return items.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports');
  }
}

export async function updateReportStatus(
  reportId: string,
  status: 'open' | 'resolved'
): Promise<void> {
  try {
    await updateDoc(doc(db, 'reports', reportId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
  }
}

export async function deleteReport(reportId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `reports/${reportId}`);
  }
}

// --- OPERACJE ADMINISTRATORA (AUTOMATYCZNIE PODBIJAJĄ dbVersion) ---

export async function batchImportQuestions(
  items: ParsedQuestionInput[],
  existingCategories: string[],
  onBatchProgress?: (completedBatches: number, totalBatches: number, savedItems: number) => void
): Promise<{ addedQuestions: Question[]; nextVersion: number; nextCategories: string[]; batchCount: number }> {
  const newQuestions: Question[] = items.map((item, idx) => ({
    id: generateQuestionId(idx),
    questionHash: item.questionHash,
    category: item.category,
    question: item.question,
    options: item.options,
    correctAnswers: item.correctAnswers,
    hasImagePlaceholder: item.hasImagePlaceholder,
    ...(item.imageBase64 ? { imageBase64: item.imageBase64 } : {}),
    ...(item.explanation ? { explanation: item.explanation } : {})
  }));

  const totalBatches = Math.max(1, Math.ceil(newQuestions.length / FIRESTORE_BATCH_LIMIT));
  let savedItems = 0;

  try {
    for (let i = 0; i < newQuestions.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = newQuestions.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const q of chunk) {
        const ref = doc(db, 'questions', q.id);
        batch.set(ref, buildCleanQuestionPayload(q, true));
      }
      await batch.commit();
      savedItems += chunk.length;
      const batchIndex = Math.floor(i / FIRESTORE_BATCH_LIMIT) + 1;
      onBatchProgress?.(batchIndex, totalBatches, savedItems);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'questions');
  }

  const mergedCategories = Array.from(
    new Set([...existingCategories, ...newQuestions.map((q) => q.category)])
  );
  const nextVersion = await bumpDatabaseVersion(mergedCategories);

  return {
    addedQuestions: newQuestions,
    nextVersion,
    nextCategories: mergedCategories,
    batchCount: totalBatches
  };
}

export async function saveAdminQuestion(
  question: Question,
  isNew: boolean,
  existingCategories: string[]
): Promise<{ nextVersion: number; nextCategories: string[] }> {
  const ref = doc(db, 'questions', question.id);
  try {
    await setDoc(ref, buildCleanQuestionPayload(question, isNew));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `questions/${question.id}`);
  }

  const mergedCategories = Array.from(new Set([...existingCategories, question.category]));
  const nextVersion = await bumpDatabaseVersion(mergedCategories);
  return { nextVersion, nextCategories: mergedCategories };
}

export async function deleteAdminQuestion(questionId: string): Promise<number> {
  try {
    await deleteDoc(doc(db, 'questions', questionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `questions/${questionId}`);
  }
  return await bumpDatabaseVersion();
}

export async function saveCategoriesList(
  categories: string[],
  renameFrom?: string,
  renameTo?: string,
  affectedQuestions?: Question[]
): Promise<number> {
  if (renameFrom && renameTo && affectedQuestions && affectedQuestions.length > 0) {
    try {
      for (let i = 0; i < affectedQuestions.length; i += FIRESTORE_BATCH_LIMIT) {
        const chunk = affectedQuestions.slice(i, i + FIRESTORE_BATCH_LIMIT);
        const batch = writeBatch(db);
        for (const q of chunk) {
          const ref = doc(db, 'questions', q.id);
          batch.update(ref, { category: renameTo, updatedAt: serverTimestamp() });
        }
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'questions');
    }
  }

  return await bumpDatabaseVersion(categories);
}
