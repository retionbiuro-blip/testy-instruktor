import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { ExamView } from './components/ExamView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { LeaderboardView } from './components/LeaderboardView';
import { LegalActsView } from './components/LegalActsView';
import { Navbar } from './components/Navbar';
import { StudyView } from './components/StudyView';
import { ADMIN_EMAIL, ALL_CATEGORIES_KEY, DEFAULT_CATEGORIES } from './config';
import { auth, testFirestoreConnection } from './lib/firebase';
import { getStoredTheme, setStoredTheme } from './lib/indexedDb';
import {
  fetchLeaderboard,
  fetchReports,
  loadOrCreateUserProgress,
  syncLegalActsWithCache,
  syncLessonsWithCache,
  syncQuestionsWithCache
} from './services/firestoreService';
import {
  AppView,
  LeaderboardEntry,
  LegalAct,
  Lesson,
  Question,
  ReportItem,
  UserProgress
} from './types';

const GUEST_PROGRESS: UserProgress = {
  uid: 'guest',
  nick: 'Gość',
  email: '',
  masteredIds: [],
  mistakeStreaks: {},
  askLecturerIds: [],
  privateNotes: {},
  totalAnswered: 0,
  totalCorrect: 0,
  streakDays: 0,
  lastStudyDate: undefined,
  points: 0,
  examHistory: []
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme());
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [pendingNick, setPendingNick] = useState<string | undefined>(undefined);
  const [isGuest, setIsGuest] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');

  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES_KEY);
  const [adminInitialTab, setAdminInitialTab] = useState<'import' | 'lessons' | 'legal-acts' | undefined>(
    undefined
  );

  const [questions, setQuestions] = useState<Question[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [legalActs, setLegalActs] = useState<LegalAct[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [notebookLmUrl, setNotebookLmUrl] = useState<string | undefined>(undefined);
  const [dbVersion, setDbVersion] = useState<number>(0);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  // Synchronizacja klasy .dark na elemencie <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    setStoredTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Nasłuch stanu logowania Firebase (browserLocalPersistence)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (user) {
        setIsGuest(false);
      } else {
        setProgress(null);
        setCurrentView('dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = Boolean(
    authUser?.email && authUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  // Inicjalizacja danych po zalogowaniu (1 odczyt system/metadata + cache IndexedDB)
  const bootstrapAppData = useCallback(
    async (user: User, adminFlag: boolean, nickHint?: string) => {
      setLoadingData(true);
      setAppError(null);
      try {
        await testFirestoreConnection();

        const [syncRes, userProg, board] = await Promise.all([
          syncQuestionsWithCache(adminFlag, false),
          loadOrCreateUserProgress(user, nickHint),
          fetchLeaderboard()
        ]);

        const [lessonsRes, actsRes] = await Promise.all([
          syncLessonsWithCache(syncRes.metadata, false),
          syncLegalActsWithCache(syncRes.metadata, false)
        ]);

        setQuestions(syncRes.questions);
        setLessons(lessonsRes.lessons);
        setLegalActs(actsRes.legalActs);
        setCategories(syncRes.metadata.categories);
        setNotebookLmUrl(syncRes.metadata.notebookLmUrl);
        setDbVersion(syncRes.metadata.dbVersion);
        setProgress(userProg);
        setLeaderboard(board);

        if (adminFlag) {
          const reps = await fetchReports();
          setReports(reps);
        }
      } catch (err) {
        console.error('Błąd ładowania danych aplikacji:', err);
        setAppError(
          'Nie udało się pobrać danych z Firestore. Upewnij się, że w konsoli Firebase wdrożono reguły bezpieczeństwa (firestore.rules) oraz włączono Firestore Database.'
        );
      } finally {
        setLoadingData(false);
      }
    },
    []
  );

  // Inicjalizacja pytań w trybie gościa (1 odczyt system/metadata + cache IndexedDB)
  const bootstrapGuestData = useCallback(async () => {
    setLoadingData(true);
    setAppError(null);
    try {
      await testFirestoreConnection();
      const syncRes = await syncQuestionsWithCache(false, false);
      setQuestions(syncRes.questions);
      setCategories(syncRes.metadata.categories);
      setNotebookLmUrl(syncRes.metadata.notebookLmUrl);
      setDbVersion(syncRes.metadata.dbVersion);
    } catch (err) {
      console.error('Błąd ładowania pytań w trybie gościa:', err);
      setAppError(
        'Nie udało się pobrać bazy pytań z Firestore. Upewnij się, że w konsoli Firebase wdrożono aktualne reguły bezpieczeństwa (firestore.rules).'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (authUser) {
      void bootstrapAppData(authUser, isAdmin, pendingNick);
    } else if (isGuest) {
      void bootstrapGuestData();
    }
  }, [authReady, authUser, isGuest, isAdmin, pendingNick, bootstrapAppData, bootstrapGuestData]);

  const handleRefreshSync = useCallback(async () => {
    if ((!authUser && !isGuest) || syncing) return;
    setSyncing(true);
    try {
      if (isGuest) {
        const syncRes = await syncQuestionsWithCache(false, false);
        setQuestions(syncRes.questions);
        setCategories(syncRes.metadata.categories);
        setNotebookLmUrl(syncRes.metadata.notebookLmUrl);
        setDbVersion(syncRes.metadata.dbVersion);
      } else {
        const [syncRes, board] = await Promise.all([
          syncQuestionsWithCache(isAdmin, false),
          fetchLeaderboard()
        ]);
        const [lessonsRes, actsRes] = await Promise.all([
          syncLessonsWithCache(syncRes.metadata, false),
          syncLegalActsWithCache(syncRes.metadata, false)
        ]);
        setQuestions(syncRes.questions);
        setLessons(lessonsRes.lessons);
        setLegalActs(actsRes.legalActs);
        setCategories(syncRes.metadata.categories);
        setNotebookLmUrl(syncRes.metadata.notebookLmUrl);
        setDbVersion(syncRes.metadata.dbVersion);
        setLeaderboard(board);
      }
    } finally {
      setSyncing(false);
    }
  }, [authUser, isGuest, isAdmin, syncing]);

  const handleRefreshLeaderboard = useCallback(async () => {
    if (isGuest) return;
    setLoadingLeaderboard(true);
    try {
      const board = await fetchLeaderboard();
      setLeaderboard(board);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [isGuest]);

  const handleRefreshReports = useCallback(async () => {
    if (!isAdmin) return;
    const reps = await fetchReports();
    setReports(reps);
  }, [isAdmin]);

  const handleNavigate = useCallback(
    (view: AppView) => {
      if (view === 'admin' && !isAdmin) return;
      if (view !== 'admin') {
        setAdminInitialTab(undefined);
      }
      setCurrentView(view);
      if (!isGuest && (view === 'leaderboard' || view === 'dashboard')) {
        void handleRefreshLeaderboard();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isAdmin, isGuest, handleRefreshLeaderboard]
  );

  const handleStartMode = useCallback(
    (view: AppView, cat?: string) => {
      if (cat !== undefined) {
        setSelectedCategory(cat);
      }
      handleNavigate(view);
    },
    [handleNavigate]
  );

  const handleRequireAuth = useCallback((mode: 'login' | 'register') => {
    setAuthInitialMode(mode);
    setIsGuest(false);
  }, []);

  const handleLogout = useCallback(async () => {
    setPendingNick(undefined);
    setIsGuest(false);
    await signOut(auth);
  }, []);

  // Ekran oczekiwania na sprawdzenie sesji
  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-blue-700 dark:text-blue-400" />
          <span>Sprawdzanie sesji...</span>
        </div>
      </div>
    );
  }

  // Ekran logowania i rejestracji
  if (!authUser && !isGuest) {
    return (
      <AuthScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        onRegisteredNick={(nick) => setPendingNick(nick)}
        initialMode={authInitialMode}
        onContinueAsGuest={() => {
          setIsGuest(true);
          setCurrentView('dashboard');
        }}
      />
    );
  }

  const guestModeActive = !authUser && isGuest;
  const activeProgress = guestModeActive ? GUEST_PROGRESS : progress;
  const mistakesCount = activeProgress ? Object.keys(activeProgress.mistakeStreaks).length : 0;
  const openReportsCount = reports.filter((r) => r.status === 'open').length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900 md:pb-10 dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        nick={activeProgress?.nick ?? authUser?.displayName ?? 'Kursant'}
        isAdmin={isAdmin}
        isGuest={guestModeActive}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onSwitchToAuth={() => handleRequireAuth('login')}
        mistakesCount={mistakesCount}
        openReportsCount={openReportsCount}
      />

      {guestModeActive && (
        <div
          role="region"
          aria-label="Informacja o trybie gościa"
          className="border-b border-amber-200 bg-amber-50/90 px-4 py-2.5 text-xs text-amber-950 sm:px-6 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex items-start gap-2 sm:items-center">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 sm:mt-0 dark:text-amber-400" aria-hidden="true" />
              <span>
                Korzystasz z trybu gościa — Twoje postępy, powtórka błędów i punkty w rankingu nie są zapisywane. Załóż darmowe konto, aby śledzić naukę.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleRequireAuth('register')}
              className="shrink-0 cursor-pointer self-start rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap transition-colors hover:bg-amber-800 sm:self-auto dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
            >
              Załóż darmowe konto
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {appError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Błąd połączenia z bazą danych</p>
              <p className="mt-1">{appError}</p>
            </div>
          </div>
        )}

        {loadingData || !activeProgress ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-7 w-7 animate-spin text-blue-700 dark:text-blue-400" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              {guestModeActive
                ? 'Synchronizowanie bazy pytań...'
                : 'Synchronizowanie bazy pytań i Twoich postępów...'}
            </p>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
              <DashboardView
                questions={questions}
                lessons={lessons}
                categories={categories}
                notebookLmUrl={notebookLmUrl}
                progress={activeProgress}
                leaderboard={leaderboard}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onStartMode={handleStartMode}
                isAdmin={isAdmin}
                isGuest={guestModeActive}
                onRequireAuth={handleRequireAuth}
                dbVersion={dbVersion}
                onRefreshSync={handleRefreshSync}
                syncing={syncing}
              />
            )}

            {currentView === 'knowledge' && (
              <KnowledgeBaseView
                lessons={lessons}
                categories={categories}
                notebookLmUrl={notebookLmUrl}
                progress={activeProgress}
                onProgressChange={setProgress}
                isGuest={guestModeActive}
                isAdmin={isAdmin}
                onRequireAuth={handleRequireAuth}
                onPracticeCategory={(cat) => handleStartMode('study', cat)}
                onOpenAdminMaterials={() => {
                  setAdminInitialTab('lessons');
                  handleNavigate('admin');
                }}
                onBackToDashboard={() => handleNavigate('dashboard')}
              />
            )}

            {currentView === 'legal-acts' && (
              <LegalActsView
                legalActs={legalActs}
                isGuest={guestModeActive}
                isAdmin={isAdmin}
                onRequireAuth={handleRequireAuth}
                onOpenAdminLegalActs={() => {
                  setAdminInitialTab('legal-acts');
                  handleNavigate('admin');
                }}
                onBackToDashboard={() => handleNavigate('dashboard')}
              />
            )}

            {(currentView === 'study' ||
              currentView === 'mistakes' ||
              currentView === 'lecturer') && (
              <StudyView
                mode={currentView}
                questions={questions}
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                progress={activeProgress}
                onProgressChange={setProgress}
                isAdmin={isAdmin}
                isGuest={guestModeActive}
                onRequireAuth={handleRequireAuth}
                onBackToDashboard={() => handleNavigate('dashboard')}
              />
            )}

            {(currentView === 'exam' || currentView === 'quick10') && (
              <ExamView
                mode={currentView}
                questions={questions}
                categories={categories}
                defaultCategory={selectedCategory}
                progress={activeProgress}
                isGuest={guestModeActive}
                onRequireAuth={handleRequireAuth}
                onProgressChange={setProgress}
                onBackToDashboard={() => handleNavigate('dashboard')}
              />
            )}

            {currentView === 'leaderboard' && (
              <LeaderboardView
                entries={leaderboard}
                progress={activeProgress}
                isGuest={guestModeActive}
                onRequireAuth={handleRequireAuth}
                onRefresh={handleRefreshLeaderboard}
                loading={loadingLeaderboard}
              />
            )}

            {currentView === 'admin' && isAdmin && (
              <AdminPanel
                questions={questions}
                lessons={lessons}
                legalActs={legalActs}
                categories={categories}
                notebookLmUrl={notebookLmUrl}
                reports={reports}
                initialTab={adminInitialTab}
                onQuestionsUpdated={(nextQuestions, nextCats, nextVer) => {
                  setQuestions(nextQuestions);
                  setCategories(nextCats);
                  setDbVersion(nextVer);
                }}
                onLessonsUpdated={(nextLessons, nextCats, nextVer) => {
                  setLessons(nextLessons);
                  setCategories(nextCats);
                  setDbVersion(nextVer);
                }}
                onLegalActsUpdated={(nextActs, nextVer) => {
                  setLegalActs(nextActs);
                  setDbVersion(nextVer);
                }}
                onNotebookLmUpdated={(nextUrl, nextVer) => {
                  setNotebookLmUrl(nextUrl);
                  setDbVersion(nextVer);
                }}
                onReportsUpdated={setReports}
                onRefreshReports={handleRefreshReports}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
