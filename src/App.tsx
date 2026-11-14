import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { ExamView } from './components/ExamView';
import { LeaderboardView } from './components/LeaderboardView';
import { Navbar } from './components/Navbar';
import { StudyView } from './components/StudyView';
import { ADMIN_EMAIL, ALL_CATEGORIES_KEY, DEFAULT_CATEGORIES } from './config';
import { auth, testFirestoreConnection } from './lib/firebase';
import { getStoredTheme, setStoredTheme } from './lib/indexedDb';
import {
  fetchLeaderboard,
  fetchReports,
  loadOrCreateUserProgress,
  syncQuestionsWithCache
} from './services/firestoreService';
import { AppView, LeaderboardEntry, Question, ReportItem, UserProgress } from './types';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme());
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [pendingNick, setPendingNick] = useState<string | undefined>(undefined);

  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES_KEY);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
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
      if (!user) {
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

        setQuestions(syncRes.questions);
        setCategories(syncRes.metadata.categories);
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

  useEffect(() => {
    if (!authReady || !authUser) return;
    void bootstrapAppData(authUser, isAdmin, pendingNick);
  }, [authReady, authUser, isAdmin, pendingNick, bootstrapAppData]);

  const handleRefreshSync = useCallback(async () => {
    if (!authUser || syncing) return;
    setSyncing(true);
    try {
      const [syncRes, board] = await Promise.all([
        syncQuestionsWithCache(isAdmin, false),
        fetchLeaderboard()
      ]);
      setQuestions(syncRes.questions);
      setCategories(syncRes.metadata.categories);
      setDbVersion(syncRes.metadata.dbVersion);
      setLeaderboard(board);
    } finally {
      setSyncing(false);
    }
  }, [authUser, isAdmin, syncing]);

  const handleRefreshLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const board = await fetchLeaderboard();
      setLeaderboard(board);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  const handleRefreshReports = useCallback(async () => {
    if (!isAdmin) return;
    const reps = await fetchReports();
    setReports(reps);
  }, [isAdmin]);

  const handleNavigate = useCallback(
    (view: AppView) => {
      if (view === 'admin' && !isAdmin) return;
      setCurrentView(view);
      if (view === 'leaderboard' || view === 'dashboard') {
        void handleRefreshLeaderboard();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [isAdmin, handleRefreshLeaderboard]
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

  const handleLogout = useCallback(async () => {
    setPendingNick(undefined);
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
  if (!authUser) {
    return (
      <AuthScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        onRegisteredNick={(nick) => setPendingNick(nick)}
      />
    );
  }

  const mistakesCount = progress ? Object.keys(progress.mistakeStreaks).length : 0;
  const openReportsCount = reports.filter((r) => r.status === 'open').length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900 md:pb-10 dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        nick={progress?.nick ?? authUser.displayName ?? 'Kursant'}
        isAdmin={isAdmin}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        mistakesCount={mistakesCount}
        openReportsCount={openReportsCount}
      />

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

        {loadingData || !progress ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-7 w-7 animate-spin text-blue-700 dark:text-blue-400" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              Synchronizowanie bazy pytań i Twoich postępów...
            </p>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
              <DashboardView
                questions={questions}
                categories={categories}
                progress={progress}
                leaderboard={leaderboard}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onStartMode={handleStartMode}
                isAdmin={isAdmin}
                dbVersion={dbVersion}
                onRefreshSync={handleRefreshSync}
                syncing={syncing}
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
                progress={progress}
                onProgressChange={setProgress}
                isAdmin={isAdmin}
                onBackToDashboard={() => handleNavigate('dashboard')}
              />
            )}

            {(currentView === 'exam' || currentView === 'quick10') && (
              <ExamView
                mode={currentView}
                questions={questions}
                categories={categories}
                defaultCategory={selectedCategory}
                progress={progress}
                onProgressChange={setProgress}
                onBackToDashboard={() => handleNavigate('dashboard')}
              />
            )}

            {currentView === 'leaderboard' && (
              <LeaderboardView
                entries={leaderboard}
                progress={progress}
                onRefresh={handleRefreshLeaderboard}
                loading={loadingLeaderboard}
              />
            )}

            {currentView === 'admin' && isAdmin && (
              <AdminPanel
                questions={questions}
                categories={categories}
                reports={reports}
                onQuestionsUpdated={(nextQuestions, nextCats, nextVer) => {
                  setQuestions(nextQuestions);
                  setCategories(nextCats);
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
