import { User } from 'firebase/auth';
import {
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
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
  getCachedExamTopics,
  getCachedGlossaryTerms,
  getCachedLegalActs,
  getCachedLessons,
  getCachedQuestions,
  getLocalDbVersion,
  getLocalExamTopicsDbVersion,
  getLocalGlossaryTermsDbVersion,
  getLocalLegalActsDbVersion,
  getLocalLessonsDbVersion,
  saveExamTopicsToCache,
  saveGlossaryTermsToCache,
  saveLegalActsToCache,
  saveLessonsToCache,
  saveQuestionsToCache,
  setLocalDbVersion,
  setLocalExamTopicsDbVersion,
  setLocalGlossaryTermsDbVersion,
  setLocalLegalActsDbVersion,
  setLocalLessonsDbVersion
} from '../lib/indexedDb';
import {
  compareQuestionsByCreationOrder,
  generateQuestionId,
  getTodayLocalIsoDate,
  getYesterdayLocalIsoDate,
  normalizeLicenseCategory
} from '../lib/questionUtils';
import {
  CommentItem,
  ExamHistoryItem,
  ExamTopic,
  GlossaryTerm,
  LeaderboardEntry,
  LegalAct,
  Lesson,
  LessonPlanDraft,
  LicenseCategory,
  ParsedQuestionInput,
  Question,
  ReportItem,
  SavedOutlineEntry,
  SystemMetadata,
  UserProgress
} from '../types';

const METADATA_DOC_REF = doc(db, 'system', 'metadata');
const STATS_DOC_REF = doc(db, 'system', 'stats');

function timestampToDate(val: unknown): Date | null {
  if (val instanceof Timestamp) return val.toDate();
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  return null;
}

function sanitizeSavedOutlineDraft(raw: unknown, fallbackTopicTitle: string): LessonPlanDraft {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawChecked =
    src.checkedSteps && typeof src.checkedSteps === 'object'
      ? (src.checkedSteps as Record<string, unknown>)
      : {};
  const checkedSteps: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(rawChecked)) {
    if (Boolean(v)) {
      checkedSteps[String(k)] = true;
    }
  }
  return {
    topicTitle: String(src.topicTitle ?? fallbackTopicTitle).slice(0, 400),
    generalGoal: String(src.generalGoal ?? '').slice(0, 2500),
    knowledgeGoal: String(src.knowledgeGoal ?? '').slice(0, 2500),
    attitudeGoal: String(src.attitudeGoal ?? '').slice(0, 2500),
    methodsPodajaca: Boolean(src.methodsPodajaca),
    methodsProblemowa: Boolean(src.methodsProblemowa),
    methodsEksponujaca: Boolean(src.methodsEksponujaca),
    methodsNotes: String(src.methodsNotes ?? '').slice(0, 1500),
    selectedAids: Array.isArray(src.selectedAids)
      ? src.selectedAids.slice(0, 30).map((item) => String(item).slice(0, 150))
      : [],
    customAids: String(src.customAids ?? '').slice(0, 1000),
    introMinutes: String(src.introMinutes ?? '2').slice(0, 10),
    introNotes: String(src.introNotes ?? '').slice(0, 2500),
    mainMinutes: String(src.mainMinutes ?? '11').slice(0, 10),
    mainNotes: String(src.mainNotes ?? '').slice(0, 4000),
    summaryMinutes: String(src.summaryMinutes ?? '2').slice(0, 10),
    summaryNotes: String(src.summaryNotes ?? '').slice(0, 2500),
    checkedSteps
  };
}

export function sanitizeSavedOutlines(raw: unknown): SavedOutlineEntry[] {
  if (!Array.isArray(raw)) return [];
  const result: SavedOutlineEntry[] = [];
  for (const item of raw.slice(0, 50)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const topicTitle = String(obj.topicTitle ?? 'Własny temat wystąpienia').trim().slice(0, 400) || 'Własny temat wystąpienia';
    const rawDuration = Number(obj.durationMinutes);
    const durationMinutes: 10 | 15 | 20 =
      rawDuration === 10 || rawDuration === 20 ? rawDuration : 15;
    const rawSteps = Number(obj.completedSteps);
    const completedSteps = Number.isFinite(rawSteps)
      ? Math.max(0, Math.min(5, Math.round(rawSteps)))
      : 0;
    const updatedAt =
      typeof obj.updatedAt === 'string' && obj.updatedAt.trim()
        ? obj.updatedAt
        : typeof obj.savedAtIso === 'string' && obj.savedAtIso.trim()
          ? obj.savedAtIso
          : new Date().toISOString();
    const id =
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim().slice(0, 128)
        : `outline_${result.length}_${Date.now()}`;

    result.push({
      id,
      topicTitle,
      updatedAt,
      durationMinutes,
      completedSteps,
      draft: sanitizeSavedOutlineDraft(obj.draft, topicTitle)
    });
  }
  return result;
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
  const safeLicenseCategory = normalizeLicenseCategory(q.licenseCategory);
  if (safeLicenseCategory) {
    payload.licenseCategory = safeLicenseCategory;
  }
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
  if (q.importBatchId) {
    payload.importBatchId = q.importBatchId;
  }
  if (q.importBatchLabel) {
    payload.importBatchLabel = q.importBatchLabel;
  }
  if (typeof q.wrongCount === 'number' && q.wrongCount >= 0) {
    payload.wrongCount = q.wrongCount;
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
        notebookLmUrl:
          typeof data.notebookLmUrl === 'string' && data.notebookLmUrl.trim().length > 0
            ? data.notebookLmUrl.trim()
            : undefined,
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
        licenseCategory: normalizeLicenseCategory(data.licenseCategory),
        question: String(data.question ?? ''),
        options: Array.isArray(data.options) ? (data.options as string[]) : [],
        correctAnswers: Array.isArray(data.correctAnswers) ? (data.correctAnswers as number[]) : [0],
        imageBase64:
          typeof data.imageBase64 === 'string' && data.imageBase64.length > 0
            ? data.imageBase64
            : undefined,
        hasImagePlaceholder: Boolean(data.hasImagePlaceholder),
        wrongCount:
          typeof data.wrongCount === 'number' && data.wrongCount >= 0 ? data.wrongCount : 0,
        explanation: typeof data.explanation === 'string' ? data.explanation : undefined,
        importBatchId: typeof data.importBatchId === 'string' ? data.importBatchId : undefined,
        importBatchLabel: typeof data.importBatchLabel === 'string' ? data.importBatchLabel : undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });

    freshQuestions.sort(compareQuestionsByCreationOrder);

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

/**
 * Synchronizuje kolekcję lessons używając dokładnie tego samego licznika dbVersion
 * z system/metadata oraz lokalnego cache IndexedDB (wyłącznie dla zalogowanych).
 */
export async function syncLessonsWithCache(
  metadata: SystemMetadata,
  forceServerFetch = false
): Promise<{ lessons: Lesson[]; syncedFromServer: boolean }> {
  const localLessonsVersion = getLocalLessonsDbVersion();
  const cachedLessons = await getCachedLessons();

  const needsSync =
    forceServerFetch ||
    localLessonsVersion < 0 ||
    metadata.dbVersion > localLessonsVersion;

  if (!needsSync) {
    return {
      lessons: cachedLessons.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl')),
      syncedFromServer: false
    };
  }

  try {
    const snapshot = await getDocs(collection(db, 'lessons'));
    const freshLessons: Lesson[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id ?? d.id),
        category: String(data.category ?? 'Ogólne / Mix'),
        title: String(data.title ?? ''),
        order: typeof data.order === 'number' ? data.order : 1,
        legalBasis: String(data.legalBasis ?? ''),
        content: String(data.content ?? ''),
        keyTakeaways: String(data.keyTakeaways ?? ''),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });

    freshLessons.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl'));

    await saveLessonsToCache(freshLessons);
    setLocalLessonsDbVersion(metadata.dbVersion);

    return {
      lessons: freshLessons,
      syncedFromServer: true
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'lessons');
  }
}

/**
 * Synchronizuje kolekcję legalActs używając tego samego licznika dbVersion
 * z system/metadata oraz lokalnego cache IndexedDB (wyłącznie dla zalogowanych).
 */
export async function syncLegalActsWithCache(
  metadata: SystemMetadata,
  forceServerFetch = false
): Promise<{ legalActs: LegalAct[]; syncedFromServer: boolean }> {
  const localLegalActsVersion = getLocalLegalActsDbVersion();
  const cachedActs = await getCachedLegalActs();

  const needsSync =
    forceServerFetch ||
    localLegalActsVersion < 0 ||
    metadata.dbVersion > localLegalActsVersion;

  if (!needsSync) {
    return {
      legalActs: cachedActs.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl')),
      syncedFromServer: false
    };
  }

  try {
    const snapshot = await getDocs(collection(db, 'legalActs'));
    const freshActs: LegalAct[] = snapshot.docs.map((d) => {
      const data = d.data();
      const rawType = data.type;
      const safeType =
        rawType === 'ustawa' || rawType === 'rozporzadzenie' || rawType === 'inne'
          ? rawType
          : 'inne';
      return {
        id: String(data.id ?? d.id),
        title: String(data.title ?? ''),
        type: safeType,
        description: String(data.description ?? ''),
        url: String(data.url ?? ''),
        order: typeof data.order === 'number' ? data.order : 1,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });

    freshActs.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl'));

    await saveLegalActsToCache(freshActs);
    setLocalLegalActsDbVersion(metadata.dbVersion);

    return {
      legalActs: freshActs,
      syncedFromServer: true
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'legalActs');
  }
}

/**
 * Synchronizuje kolekcję examTopics używając tego samego licznika dbVersion
 * z system/metadata oraz lokalnego cache IndexedDB (wyłącznie dla zalogowanych).
 */
export async function syncExamTopicsWithCache(
  metadata: SystemMetadata,
  forceServerFetch = false
): Promise<{ examTopics: ExamTopic[]; syncedFromServer: boolean }> {
  const localVersion = getLocalExamTopicsDbVersion();
  const cachedTopics = await getCachedExamTopics();

  const needsSync =
    forceServerFetch ||
    localVersion < 0 ||
    metadata.dbVersion > localVersion;

  if (!needsSync) {
    return {
      examTopics: cachedTopics.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl')),
      syncedFromServer: false
    };
  }

  try {
    const snapshot = await getDocs(collection(db, 'examTopics'));
    const freshTopics: ExamTopic[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id ?? d.id),
        category: String(data.category ?? 'Przepisy ruchu drogowego'),
        title: String(data.title ?? ''),
        commissionTips: String(data.commissionTips ?? ''),
        sampleOutline: String(data.sampleOutline ?? ''),
        order: typeof data.order === 'number' ? data.order : 1,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });

    freshTopics.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl'));

    await saveExamTopicsToCache(freshTopics);
    setLocalExamTopicsDbVersion(metadata.dbVersion);

    return {
      examTopics: freshTopics,
      syncedFromServer: true
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'examTopics');
  }
}

/**
 * Synchronizuje kolekcję glossaryTerms używając tego samego licznika dbVersion
 * z system/metadata oraz lokalnego cache IndexedDB (wyłącznie dla zalogowanych).
 */
export async function syncGlossaryTermsWithCache(
  metadata: SystemMetadata,
  forceServerFetch = false
): Promise<{ glossaryTerms: GlossaryTerm[]; syncedFromServer: boolean }> {
  const localVersion = getLocalGlossaryTermsDbVersion();
  const cachedTerms = await getCachedGlossaryTerms();

  const needsSync =
    forceServerFetch ||
    localVersion < 0 ||
    metadata.dbVersion > localVersion;

  if (!needsSync) {
    return {
      glossaryTerms: cachedTerms.sort(
        (a, b) => a.order - b.order || a.term.localeCompare(b.term, 'pl')
      ),
      syncedFromServer: false
    };
  }

  try {
    const snapshot = await getDocs(collection(db, 'glossaryTerms'));
    const freshTerms: GlossaryTerm[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.id ?? d.id),
        category: String(data.category ?? 'Dydaktyka'),
        term: String(data.term ?? ''),
        definition: String(data.definition ?? ''),
        example: String(data.example ?? ''),
        order: typeof data.order === 'number' ? data.order : 1,
        examTip:
          typeof data.examTip === 'string' && data.examTip.trim().length > 0
            ? data.examTip.trim()
            : undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });

    freshTerms.sort((a, b) => a.order - b.order || a.term.localeCompare(b.term, 'pl'));

    await saveGlossaryTermsToCache(freshTerms);
    setLocalGlossaryTermsDbVersion(metadata.dbVersion);

    return {
      glossaryTerms: freshTerms,
      syncedFromServer: true
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'glossaryTerms');
  }
}

async function bumpDatabaseVersion(
  nextCategories?: string[],
  knownCurrentVersion?: number,
  notebookLmUrlOverride?: string | null
): Promise<number> {
  let currentVersion = knownCurrentVersion ?? 0;
  let categories = nextCategories ?? DEFAULT_CATEGORIES;
  let notebookLmUrl: string | null = null;

  try {
    const snap = await getDoc(METADATA_DOC_REF);
    if (snap.exists()) {
      const data = snap.data();
      currentVersion = typeof data.dbVersion === 'number' ? data.dbVersion : currentVersion;
      if (!nextCategories && Array.isArray(data.categories) && data.categories.length > 0) {
        categories = data.categories as string[];
      }
      if (typeof data.notebookLmUrl === 'string' && data.notebookLmUrl.trim().length > 0) {
        notebookLmUrl = data.notebookLmUrl.trim();
      }
    }

    if (notebookLmUrlOverride !== undefined) {
      notebookLmUrl = notebookLmUrlOverride;
    }

    const nextVersion = currentVersion + 1;
    const payload: Record<string, unknown> = {
      dbVersion: nextVersion,
      categories,
      updatedAt: serverTimestamp()
    };
    if (notebookLmUrl && notebookLmUrl.trim().length > 0) {
      payload.notebookLmUrl = notebookLmUrl.trim().slice(0, 1000);
    }

    await setDoc(METADATA_DOC_REF, payload);
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
        completedLessonIds: Array.isArray(data.completedLessonIds)
          ? (data.completedLessonIds as string[])
          : [],
        mistakeStreaks:
          data.mistakeStreaks && typeof data.mistakeStreaks === 'object'
            ? (data.mistakeStreaks as Record<string, number>)
            : {},
        askLecturerIds: Array.isArray(data.askLecturerIds) ? (data.askLecturerIds as string[]) : [],
        privateNotes:
          data.privateNotes && typeof data.privateNotes === 'object'
            ? (data.privateNotes as Record<string, string>)
            : {},
        savedOutlines: sanitizeSavedOutlines(data.savedOutlines),
        totalAnswered: typeof data.totalAnswered === 'number' ? data.totalAnswered : 0,
        totalCorrect: typeof data.totalCorrect === 'number' ? data.totalCorrect : 0,
        points: typeof data.points === 'number' ? data.points : 0,
        streakDays: typeof data.streakDays === 'number' ? data.streakDays : 0,
        lastStudyDate: typeof data.lastStudyDate === 'string' ? data.lastStudyDate : '',
        examHistory: Array.isArray(data.examHistory) ? (data.examHistory as ExamHistoryItem[]) : [],
        unreadNotifications:
          typeof data.unreadNotifications === 'number'
            ? Math.max(0, data.unreadNotifications)
            : 0
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
      completedLessonIds: [],
      mistakeStreaks: {},
      askLecturerIds: [],
      privateNotes: {},
      savedOutlines: [],
      totalAnswered: 0,
      totalCorrect: 0,
      points: 0,
      streakDays: 0,
      lastStudyDate: '',
      examHistory: [],
      unreadNotifications: 0
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

export function subscribeToUserUnreadNotifications(
  uid: string,
  onCount: (count: number) => void
): () => void {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const count =
        typeof data.unreadNotifications === 'number'
          ? Math.max(0, data.unreadNotifications)
          : 0;
      onCount(count);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
  );
}

export async function clearUserUnreadNotifications(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      unreadNotifications: 0,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
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
    await setDoc(
      userRef,
      {
        uid: progress.uid,
        nick: progress.nick,
        email: progress.email,
        masteredIds: progress.masteredIds.slice(0, 10000),
        completedLessonIds: (progress.completedLessonIds ?? []).slice(0, 2000),
        mistakeStreaks: progress.mistakeStreaks,
        askLecturerIds: progress.askLecturerIds.slice(0, 5000),
        privateNotes: progress.privateNotes,
        savedOutlines: sanitizeSavedOutlines(progress.savedOutlines),
        totalAnswered: progress.totalAnswered,
        totalCorrect: progress.totalCorrect,
        points: progress.points,
        streakDays: progress.streakDays,
        lastStudyDate: progress.lastStudyDate ?? '',
        examHistory: (progress.examHistory ?? []).slice(-100),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

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

export async function toggleLessonCompleted(
  current: UserProgress,
  lessonId: string
): Promise<UserProgress> {
  const set = new Set(current.completedLessonIds ?? []);
  if (set.has(lessonId)) {
    set.delete(lessonId);
  } else {
    set.add(lessonId);
  }
  const updated: UserProgress = {
    ...current,
    completedLessonIds: Array.from(set)
  };
  await persistUserAndLeaderboard(updated);
  return updated;
}

export async function saveUserOutlines(
  current: UserProgress,
  nextOutlines: SavedOutlineEntry[]
): Promise<UserProgress> {
  const updated: UserProgress = {
    ...current,
    savedOutlines: sanitizeSavedOutlines(nextOutlines)
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

/**
 * Zwiększa w tle zbiorczy licznik błędnych odpowiedzi w jednym lekkim dokumencie system/stats
 * (mapa wrongCounts: { [questionId]: number }), całkowicie niezależnie od cache IndexedDB dla pytań.
 */
export async function incrementQuestionsWrongCount(questionIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(questionIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  const wrongCountsPatch: Record<string, ReturnType<typeof increment>> = {};
  for (const qId of uniqueIds) {
    wrongCountsPatch[qId] = increment(1);
  }

  try {
    await setDoc(STATS_DOC_REF, { wrongCounts: wrongCountsPatch }, { merge: true });
  } catch (error) {
    console.warn('Nie udało się zaktualizować statystyki błędów grupy w system/stats:', error);
  }
}

/**
 * Pobiera jednorazowo dokument system/stats (1 lekki odczyt) z mapą wrongCounts.
 */
export async function fetchSystemWrongCounts(): Promise<Record<string, number>> {
  try {
    const snap = await getDoc(STATS_DOC_REF);
    if (!snap.exists()) return {};
    const data = snap.data();
    const rawMap = data?.wrongCounts;
    if (!rawMap || typeof rawMap !== 'object') return {};

    const result: Record<string, number> = {};
    for (const [qId, count] of Object.entries(rawMap as Record<string, unknown>)) {
      if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
        result[qId] = count;
      }
    }
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'system/stats');
  }
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

// --- ZGŁOSZENIA BŁĘDÓW I ODPOWIEDZI ADMINA (kolekcja reports) ---

function mapReportDoc(d: QueryDocumentSnapshot<DocumentData>): ReportItem {
  const data = d.data();
  return {
    id: d.id,
    questionId: String(data.questionId ?? ''),
    questionText: String(data.questionText ?? data.questionSnippet ?? ''),
    category: String(data.category ?? ''),
    userId: String(data.userId ?? data.reporterUid ?? ''),
    userNick: String(data.userNick ?? data.reporterNick ?? 'Kursant'),
    reason: String(data.reason ?? ''),
    status: data.status === 'resolved' ? 'resolved' : 'open',
    adminReply:
      typeof data.adminReply === 'string' && data.adminReply.trim().length > 0
        ? data.adminReply
        : null,
    repliedAt: timestampToDate(data.repliedAt),
    isReadByUser: typeof data.isReadByUser === 'boolean' ? data.isReadByUser : true,
    createdAt: timestampToDate(data.createdAt)
  };
}

export async function submitReport(
  question: Question,
  userId: string,
  userNick: string,
  reason: string
): Promise<void> {
  const newRef = doc(collection(db, 'reports'));
  try {
    await setDoc(newRef, {
      questionId: question.id,
      questionText: question.question.slice(0, 280),
      category: question.category.slice(0, 120),
      userId,
      userNick: userNick.slice(0, 60),
      reason: reason.trim().slice(0, 1000),
      status: 'open',
      adminReply: null,
      repliedAt: null,
      isReadByUser: true,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reports/${newRef.id}`);
  }
}

export async function fetchReports(): Promise<ReportItem[]> {
  try {
    const snap = await getDocs(collection(db, 'reports'));
    const items = snap.docs.map(mapReportDoc);
    return items.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
      return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports');
  }
}

export async function fetchUserReports(userId: string): Promise<ReportItem[]> {
  try {
    const q = query(collection(db, 'reports'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const items = snap.docs.map(mapReportDoc);
    return items.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports');
  }
}

export async function markUserReportsAsRead(reportIds: string[]): Promise<void> {
  if (reportIds.length === 0) return;
  try {
    for (let i = 0; i < reportIds.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = reportIds.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const reportId of chunk) {
        batch.update(doc(db, 'reports', reportId), { isReadByUser: true });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'reports');
  }
}

export async function replyToReport(
  report: ReportItem,
  adminReplyText: string
): Promise<void> {
  const cleanReply = adminReplyText.trim().slice(0, 2000);
  if (!cleanReply) {
    throw new Error('Wpisz treść odpowiedzi dla kursanta.');
  }

  try {
    await updateDoc(doc(db, 'reports', report.id), {
      adminReply: cleanReply,
      status: 'resolved',
      isReadByUser: false,
      repliedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${report.id}`);
  }

  if (report.userId) {
    try {
      await updateDoc(doc(db, 'users', report.userId), {
        unreadNotifications: increment(1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${report.userId}`);
    }
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
  onBatchProgress?: (completedBatches: number, totalBatches: number, savedItems: number) => void,
  importBatchMeta?: { importBatchId: string; importBatchLabel: string }
): Promise<{ addedQuestions: Question[]; nextVersion: number; nextCategories: string[]; batchCount: number }> {
  const importTimestamp = Date.now();
  const batchId = importBatchMeta?.importBatchId ?? `batch_${importTimestamp}`;
  const batchLabel =
    importBatchMeta?.importBatchLabel ??
    `Import JSON · ${new Date(importTimestamp).toLocaleString('pl-PL')}`;

  const newQuestions: Question[] = items.map((item, idx) => ({
    id: generateQuestionId(idx, importTimestamp),
    questionHash: item.questionHash,
    category: item.category,
    ...(item.licenseCategory ? { licenseCategory: item.licenseCategory } : {}),
    question: item.question,
    options: item.options,
    correctAnswers: item.correctAnswers,
    hasImagePlaceholder: item.hasImagePlaceholder,
    importBatchId: batchId.slice(0, 128),
    importBatchLabel: batchLabel.slice(0, 200),
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

/**
 * Hurtowy zapis skompresowanych obrazków (Base64) do wybranych pytań w paczkach batch
 * z bezpiecznym limitem rozmiaru żądania Firestore (< 10 MB) oraz podbiciem dbVersion.
 */
export async function batchUpdateQuestionImages(
  updates: { questionId: string; imageBase64: string }[],
  onBatchProgress?: (completedBatches: number, totalBatches: number, savedItems: number) => void
): Promise<{ nextVersion: number; batchCount: number }> {
  if (updates.length === 0) {
    throw new Error('Brak dopasowanych obrazków do zapisania.');
  }

  // Dzielimy paczki tak, aby pojedynczy batch nie przekroczył ~3.5 MB ani 100 dokumentów (limit Firestore to 10 MB / 500 ops)
  const MAX_BATCH_BYTES = 3.5 * 1024 * 1024;
  const MAX_BATCH_DOCS = 100;
  const chunks: { questionId: string; imageBase64: string }[][] = [];
  let currentChunk: { questionId: string; imageBase64: string }[] = [];
  let currentBytes = 0;

  for (const item of updates) {
    const itemBytes = item.imageBase64.length + 512;
    if (
      currentChunk.length > 0 &&
      (currentChunk.length >= MAX_BATCH_DOCS || currentBytes + itemBytes > MAX_BATCH_BYTES)
    ) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentBytes = 0;
    }
    currentChunk.push(item);
    currentBytes += itemBytes;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  let savedItems = 0;
  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const batch = writeBatch(db);
      for (const item of chunk) {
        const ref = doc(db, 'questions', item.questionId);
        batch.update(ref, {
          imageBase64: item.imageBase64,
          hasImagePlaceholder: false,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      savedItems += chunk.length;
      onBatchProgress?.(i + 1, chunks.length, savedItems);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'questions');
  }

  const nextVersion = await bumpDatabaseVersion();
  return { nextVersion, batchCount: chunks.length };
}

/**
 * Masowa zmiana kategorii dla zaznaczonych pytań w paczkach batch po max 400 rekordów.
 */
export async function batchChangeQuestionsCategory(
  questionIds: string[],
  targetCategory: string,
  existingCategories: string[]
): Promise<{ nextVersion: number; nextCategories: string[] }> {
  const cleanCategory = targetCategory.trim().slice(0, 120);
  if (!cleanCategory || questionIds.length === 0) {
    throw new Error('Wybierz pytania oraz docelową kategorię.');
  }

  try {
    for (let i = 0; i < questionIds.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = questionIds.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const qId of chunk) {
        batch.update(doc(db, 'questions', qId), {
          category: cleanCategory,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'questions');
  }

  const nextCategories = Array.from(new Set([...existingCategories, cleanCategory]));
  const nextVersion = await bumpDatabaseVersion(nextCategories);
  return { nextVersion, nextCategories };
}

/**
 * Masowa zmiana kategorii prawa jazdy (licenseCategory) w paczkach batch po max 400 rekordów.
 * Nie narusza działu tematycznego (category), ID pytania ani postępów kursanta.
 */
export async function batchUpdateQuestionsLicenseCategory(
  updates: { questionId: string; licenseCategory: LicenseCategory }[]
): Promise<number> {
  if (updates.length === 0) {
    throw new Error('Brak pytań do przypisania kategorii prawa jazdy.');
  }

  try {
    for (let i = 0; i < updates.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = updates.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const item of chunk) {
        batch.update(doc(db, 'questions', item.questionId), {
          licenseCategory: item.licenseCategory,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'questions');
  }

  return await bumpDatabaseVersion();
}

/**
 * Masowe czyszczenie obrazków (imageBase64: null) i przywrócenie hasImagePlaceholder: true
 * w paczkach batch po max 400 rekordów.
 */
export async function batchClearQuestionImages(
  questionIds: string[]
): Promise<number> {
  if (questionIds.length === 0) {
    throw new Error('Brak pytań do wyczyszczenia obrazków.');
  }

  try {
    for (let i = 0; i < questionIds.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = questionIds.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const qId of chunk) {
        batch.update(doc(db, 'questions', qId), {
          imageBase64: null,
          hasImagePlaceholder: true,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'questions');
  }

  return await bumpDatabaseVersion();
}

/**
 * Masowe trwałe usuwanie pytań z Firestore w paczkach batch po max 400 rekordów.
 */
export async function batchDeleteQuestions(
  questionIds: string[]
): Promise<number> {
  if (questionIds.length === 0) {
    throw new Error('Brak pytań do usunięcia.');
  }

  try {
    for (let i = 0; i < questionIds.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = questionIds.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const qId of chunk) {
        batch.delete(doc(db, 'questions', qId));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'questions');
  }

  return await bumpDatabaseVersion();
}

// --- BAZA WIEDZY (LEKCJE I GOOGLE NOTEBOOKLM) ---

export function generateLessonId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `lesson_${Date.now()}_${rand}`;
}

export async function saveAdminNotebookLmUrl(
  rawUrl: string
): Promise<{ nextVersion: number; notebookLmUrl?: string }> {
  const trimmed = rawUrl.trim();
  if (trimmed.length > 0 && !/^https?:\/\/.+/i.test(trimmed)) {
    throw new Error('Link do Google NotebookLM musi zaczynać się od https:// lub http://');
  }
  const safeUrl = trimmed.length > 0 ? trimmed.slice(0, 1000) : null;
  const nextVersion = await bumpDatabaseVersion(undefined, undefined, safeUrl);
  return {
    nextVersion,
    notebookLmUrl: safeUrl ?? undefined
  };
}

export async function saveAdminLesson(
  lesson: Lesson,
  isNew: boolean,
  existingCategories: string[]
): Promise<{ nextVersion: number; nextCategories: string[] }> {
  const ref = doc(db, 'lessons', lesson.id);
  const payload: Record<string, unknown> = {
    id: lesson.id,
    category: lesson.category.trim().slice(0, 120),
    title: lesson.title.trim().slice(0, 250),
    order: Math.max(0, Math.min(10000, Math.round(lesson.order))),
    legalBasis: lesson.legalBasis.trim().slice(0, 300),
    content: lesson.content.trim().slice(0, 50000),
    keyTakeaways: lesson.keyTakeaways.trim().slice(0, 8000),
    updatedAt: serverTimestamp()
  };
  if (isNew) {
    payload.createdAt = serverTimestamp();
  } else if (lesson.createdAt) {
    payload.createdAt = lesson.createdAt;
  }

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `lessons/${lesson.id}`);
  }

  const mergedCategories = Array.from(new Set([...existingCategories, lesson.category.trim()]));
  const nextVersion = await bumpDatabaseVersion(mergedCategories);
  return { nextVersion, nextCategories: mergedCategories };
}

export async function deleteAdminLesson(lessonId: string): Promise<number> {
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `lessons/${lessonId}`);
  }
  return await bumpDatabaseVersion();
}

// --- AKTY PRAWNE (kolekcja legalActs) ---

export function generateLegalActId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `act_${Date.now()}_${rand}`;
}

export async function saveAdminLegalAct(
  act: LegalAct,
  isNew: boolean
): Promise<number> {
  const trimmedUrl = act.url.trim();
  if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
    throw new Error('Link do dokumentu musi zaczynać się od https:// lub http://');
  }

  const ref = doc(db, 'legalActs', act.id);
  const payload: Record<string, unknown> = {
    id: act.id,
    title: act.title.trim().slice(0, 300),
    type: act.type,
    description: act.description.trim().slice(0, 600),
    url: trimmedUrl.slice(0, 1500),
    order: Math.max(0, Math.min(10000, Math.round(act.order))),
    updatedAt: serverTimestamp()
  };
  if (isNew) {
    payload.createdAt = serverTimestamp();
  } else if (act.createdAt) {
    payload.createdAt = act.createdAt;
  }

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `legalActs/${act.id}`);
  }

  return await bumpDatabaseVersion();
}

export async function deleteAdminLegalAct(actId: string): Promise<number> {
  try {
    await deleteDoc(doc(db, 'legalActs', actId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `legalActs/${actId}`);
  }
  return await bumpDatabaseVersion();
}

// --- TEMATY I WZORCOWE KONSPEKTY EGZAMINACYJNE (kolekcja examTopics) ---

export function generateExamTopicId(index = 0): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `topic_${Date.now()}_${index}_${rand}`;
}

function buildExamTopicPayload(topic: ExamTopic, isNew: boolean): Record<string, unknown> {
  const cleanTitle = topic.title.trim().slice(0, 400);
  const cleanCategory = (topic.category.trim() || 'Przepisy ruchu drogowego').slice(0, 120);
  if (!cleanTitle) {
    throw new Error('Podaj tytuł tematu egzaminacyjnego.');
  }

  const payload: Record<string, unknown> = {
    id: topic.id,
    category: cleanCategory,
    title: cleanTitle,
    commissionTips: topic.commissionTips.trim().slice(0, 2000),
    sampleOutline: topic.sampleOutline.trim().slice(0, 50000),
    order: Number.isFinite(Number(topic.order))
      ? Math.max(0, Math.min(10000, Math.round(Number(topic.order))))
      : 1,
    updatedAt: serverTimestamp()
  };

  if (isNew) {
    payload.createdAt = serverTimestamp();
  } else if (topic.createdAt) {
    payload.createdAt = topic.createdAt;
  }

  return payload;
}

export async function saveAdminExamTopic(
  topic: ExamTopic,
  isNew: boolean
): Promise<number> {
  const payload = buildExamTopicPayload(topic, isNew);
  const ref = doc(db, 'examTopics', topic.id);

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `examTopics/${topic.id}`);
  }

  return await bumpDatabaseVersion();
}

export async function batchImportExamTopics(topics: ExamTopic[]): Promise<number> {
  if (topics.length === 0) {
    throw new Error('Brak tematów do zapisania.');
  }

  try {
    for (let i = 0; i < topics.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = topics.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const topic of chunk) {
        const ref = doc(db, 'examTopics', topic.id);
        batch.set(ref, buildExamTopicPayload(topic, !topic.createdAt));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'examTopics');
  }

  return await bumpDatabaseVersion();
}

export async function deleteAdminExamTopic(topicId: string): Promise<number> {
  try {
    await deleteDoc(doc(db, 'examTopics', topicId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `examTopics/${topicId}`);
  }
  return await bumpDatabaseVersion();
}

// --- SŁOWNIK DYDAKTYKI I PSYCHOLOGII / FISZKI (kolekcja glossaryTerms) ---

export function generateGlossaryTermId(index = 0): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `term_${Date.now()}_${index}_${rand}`;
}

function buildGlossaryTermPayload(term: GlossaryTerm, isNew: boolean): Record<string, unknown> {
  const cleanTerm = term.term.trim().slice(0, 250);
  const cleanDefinition = term.definition.trim().slice(0, 5000);
  const cleanCategory = (term.category.trim() || 'Dydaktyka').slice(0, 120);
  if (!cleanTerm) {
    throw new Error('Podaj nazwę pojęcia (hasła).');
  }
  if (!cleanDefinition) {
    throw new Error('Podaj definicję egzaminacyjną pojęcia.');
  }

  const payload: Record<string, unknown> = {
    id: term.id,
    category: cleanCategory,
    term: cleanTerm,
    definition: cleanDefinition,
    example: term.example.trim().slice(0, 5000),
    order: Number.isFinite(Number(term.order))
      ? Math.max(0, Math.min(10000, Math.round(Number(term.order))))
      : 1,
    updatedAt: serverTimestamp()
  };

  if (term.examTip && term.examTip.trim()) {
    payload.examTip = term.examTip.trim().slice(0, 2000);
  }

  if (isNew) {
    payload.createdAt = serverTimestamp();
  } else if (term.createdAt) {
    payload.createdAt = term.createdAt;
  }

  return payload;
}

export async function saveAdminGlossaryTerm(
  term: GlossaryTerm,
  isNew: boolean
): Promise<number> {
  const payload = buildGlossaryTermPayload(term, isNew);
  const ref = doc(db, 'glossaryTerms', term.id);

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `glossaryTerms/${term.id}`);
  }

  return await bumpDatabaseVersion();
}

export async function batchImportGlossaryTerms(terms: GlossaryTerm[]): Promise<number> {
  if (terms.length === 0) {
    throw new Error('Brak fiszek do zapisania.');
  }

  try {
    for (let i = 0; i < terms.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = terms.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const term of chunk) {
        const ref = doc(db, 'glossaryTerms', term.id);
        batch.set(ref, buildGlossaryTermPayload(term, !term.createdAt));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'glossaryTerms');
  }

  return await bumpDatabaseVersion();
}

export async function deleteAdminGlossaryTerm(termId: string): Promise<number> {
  try {
    await deleteDoc(doc(db, 'glossaryTerms', termId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `glossaryTerms/${termId}`);
  }
  return await bumpDatabaseVersion();
}
