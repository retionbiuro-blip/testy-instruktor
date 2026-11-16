import {
  ArrowRight,
  Award,
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Flame,
  HelpCircle,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { ALL_CATEGORIES_KEY, ALL_CATEGORIES_LABEL } from '../config';
import { formatLicenseCategoryLabel, matchesLicenseCategory } from '../lib/questionUtils';
import {
  AppView,
  LeaderboardEntry,
  Lesson,
  LicenseCategoryFilter,
  Question,
  UserProgress
} from '../types';
import { LicenseCategorySwitcher } from './LicenseCategorySwitcher';

interface DashboardViewProps {
  questions: Question[];
  lessons: Lesson[];
  categories: string[];
  notebookLmUrl?: string;
  progress: UserProgress;
  leaderboard: LeaderboardEntry[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedLicenseCategory: LicenseCategoryFilter;
  onSelectLicenseCategory: (lc: LicenseCategoryFilter) => void;
  onStartMode: (view: AppView, category?: string) => void;
  onPracticeTop20: (questionIds: string[]) => void;
  isAdmin: boolean;
  isGuest: boolean;
  onRequireAuth: (mode: 'login' | 'register') => void;
  dbVersion: number;
  onRefreshSync: () => void;
  syncing: boolean;
}

function formatWrongCountLabel(count: number): string {
  if (count === 1) return '1 błąd';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} błędy`;
  }
  return `${count} błędów`;
}

export function DashboardView({
  questions,
  lessons,
  categories,
  notebookLmUrl,
  progress,
  leaderboard,
  selectedCategory,
  onSelectCategory,
  selectedLicenseCategory,
  onSelectLicenseCategory,
  onStartMode,
  onPracticeTop20,
  isAdmin,
  isGuest,
  onRequireAuth,
  dbVersion,
  onRefreshSync,
  syncing
}: DashboardViewProps) {
  const [top20Expanded, setTop20Expanded] = useState(false);
  const masteredSet = new Set(progress.masteredIds);
  const completedLessonsSet = new Set(progress.completedLessonIds ?? []);
  const completedLessonsCount = lessons.filter((l) => completedLessonsSet.has(l.id)).length;
  const hasNotebookLm = Boolean(notebookLmUrl && /^https?:\/\/.+/i.test(notebookLmUrl.trim()));
  const mistakesCount = Object.keys(progress.mistakeStreaks).length;
  const lecturerCount = progress.askLecturerIds.length;

  const totalAllQuestions = questions.length;
  const licenseQuestions = questions.filter((q) =>
    matchesLicenseCategory(q, selectedLicenseCategory)
  );
  const totalQuestions = licenseQuestions.length;
  const masteredTotal = licenseQuestions.filter((q) => masteredSet.has(q.id)).length;
  const overallMasteryPct = totalQuestions > 0 ? Math.round((masteredTotal / totalQuestions) * 100) : 0;
  const accuracy =
    progress.totalAnswered > 0
      ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100)
      : 0;

  // Zbieramy wszystkie kategorie z metadata + ewentualne z samych pytań
  const allCategoryNames = Array.from(
    new Set([...categories, ...questions.map((q) => q.category)])
  ).filter(Boolean);

  const categoryRows = allCategoryNames.map((cat) => {
    const catQuestions = licenseQuestions.filter((q) => q.category === cat);
    const catMastered = catQuestions.filter((q) => masteredSet.has(q.id)).length;
    const pct = catQuestions.length > 0 ? Math.round((catMastered / catQuestions.length) * 100) : 0;
    return {
      name: cat,
      total: catQuestions.length,
      mastered: catMastered,
      pct
    };
  });

  const topLeaderboard = leaderboard.slice(0, 6);

  const topHardestQuestions = licenseQuestions
    .filter((q) => (q.wrongCount ?? 0) > 0)
    .sort((a, b) => (b.wrongCount ?? 0) - (a.wrongCount ?? 0))
    .slice(0, 20);

  return (
    <div className="space-y-8">
      {/* Nagłówek powitalny */}
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {isGuest ? 'Tryb gościa' : 'Pulpit kursanta'} · Wersja bazy {dbVersion} · {totalAllQuestions} pytań w pamięci lokalnej
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {isGuest ? 'Witaj w trybie gościa' : `Witaj, ${progress.nick}`}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRefreshSync}
            disabled={syncing}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 whitespace-nowrap transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Sprawdź aktualizacje bazy</span>
          </button>

          {totalQuestions > 0 && (
            <button
              type="button"
              onClick={() => onStartMode('study', selectedCategory)}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Rozpocznij naukę</span>
            </button>
          )}
        </div>
      </section>

      {/* Przełącznik kategorii prawa jazdy (Kat. B domyślna) */}
      <LicenseCategorySwitcher
        questions={questions}
        value={selectedLicenseCategory}
        onChange={onSelectLicenseCategory}
      />

      {/* Pasek kluczowych statystyk (dla zalogowanych) lub zaproszenie do konta (dla gościa) */}
      {isGuest ? (
        <section
          aria-label="Informacja o statystykach w trybie gościa"
          className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Statystyki postępów, passa dni i punkty są wyłączone w trybie gościa
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Możesz swobodnie uczyć się z pytań i rozwiązywać egzaminy. Załóż darmowe konto, aby zapisywać wyniki i powtarzać błędy.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRequireAuth('register')}
            className="shrink-0 cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white whitespace-nowrap hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Załóż darmowe konto
          </button>
        </section>
      ) : (
        <section aria-label="Podsumowanie postępów" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Opanowane pytania</span>
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <p className="font-mono mt-2 text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
              {masteredTotal} <span className="text-sm font-normal text-slate-500">/ {totalQuestions}</span>
            </p>
            <p className="font-mono mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {overallMasteryPct}% w wybranej kat.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Ogólna skuteczność</span>
              <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <p className="font-mono mt-2 text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
              {accuracy}%
            </p>
            <p className="font-mono mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {progress.totalCorrect} poprawnych z {progress.totalAnswered}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Dni nauki z rzędu</span>
              <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <p className="font-mono mt-2 text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
              {progress.streakDays} {progress.streakDays === 1 ? 'dzień' : 'dni'}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {progress.lastStudyDate ? `Ostatnia sesja: ${progress.lastStudyDate}` : 'Rozwiąż pierwsze pytanie'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Zdobyte punkty</span>
              <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <p className="font-mono mt-2 text-2xl font-bold text-slate-900 tabular-nums dark:text-white">
              {progress.points} <span className="text-sm font-normal text-slate-500">pkt</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Do rankingu grupy
            </p>
          </div>
        </section>
      )}

      {/* Pusty stan, gdy dla wybranej kategorii prawa jazdy nie przypisano jeszcze pytań */}
      {totalAllQuestions > 0 && totalQuestions === 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Brak pytań przypisanych do tej kategorii prawa jazdy
          </h2>
          <p className="mx-auto mt-1 max-w-lg text-xs text-slate-600 dark:text-slate-400">
            Wybierz kategorię „Kat. B” lub „Wszystkie” powyżej, aby przejść do pełnej bazy pytań.
          </p>
        </section>
      )}

      {/* Pusty stan, gdy w bazie nie ma jeszcze żadnych pytań */}
      {totalAllQuestions === 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Baza pytań jest obecnie pusta
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-300">
            {isAdmin
              ? 'Jesteś zalogowany jako Administrator. Przejdź do Panelu Admina, aby wgrać plik JSON z pytaniami lub załadować zestaw startowy.'
              : 'Administrator nie wgrał jeszcze pytań egzaminacyjnych do systemu. Wróć za chwilę i kliknij "Sprawdź aktualizacje bazy".'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onStartMode('admin')}
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Otwórz Panel Admina</span>
            </button>
          )}
        </section>
      )}

      {/* Kafelek Baza Wiedzy / Materiały */}
      <section aria-label="Baza Wiedzy i Materiały do nauki">
        <button
          type="button"
          onClick={() => onStartMode('knowledge')}
          className="flex w-full cursor-pointer flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-blue-400 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400">
              <BookMarked className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  Teoria przed testami
                </span>
                {!isGuest && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Przerobiono {completedLessonsCount}/{lessons.length} rozdziałów
                    </span>
                  </>
                )}
                {hasNotebookLm && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Asystent NotebookLM aktywny</span>
                  </>
                )}
              </div>
              <h2 className="font-display mt-1 text-base font-bold text-slate-900 dark:text-white">
                Baza Wiedzy / Materiały (Ustawy i Podsumowania)
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Przerabiaj uporządkowane rozdziały z aktów prawnych, korzystaj z ramek egzaminacyjnych i pytaj Wirtualnego Wykładowcę w Google NotebookLM.
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-blue-700 whitespace-nowrap dark:text-blue-400">
            <span>{isGuest ? 'Zobacz szczegóły' : 'Otwórz Bazę Wiedzy'}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      </section>

      {/* Tryby nauki i egzaminów */}
      {totalQuestions > 0 && (
        <section aria-label="Tryby treningowe" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => onStartMode('mistakes')}
            className={`flex cursor-pointer flex-col justify-between rounded-xl border p-5 text-left transition-colors ${
              isGuest
                ? 'border-slate-200 bg-slate-50/70 opacity-85 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'
                : 'border-slate-200 bg-white hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <RotateCcw className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                {isGuest ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Wymaga konta</span>
                  </span>
                ) : (
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-white">
                    {mistakesCount}
                  </span>
                )}
              </div>
              <h2 className="font-display mt-3 text-base font-bold text-slate-900 dark:text-white">
                Powtórka błędów
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Pytanie znika dopiero po 2 poprawnych odpowiedziach z rzędu.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <span>{isGuest ? 'Zaloguj się, aby odblokować' : 'Ćwicz błędy'}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => onStartMode('lecturer')}
            className={`flex cursor-pointer flex-col justify-between rounded-xl border p-5 text-left transition-colors ${
              isGuest
                ? 'border-slate-200 bg-slate-50/70 opacity-85 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'
                : 'border-slate-200 bg-white hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                {isGuest ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Wymaga konta</span>
                  </span>
                ) : (
                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-white">
                    {lecturerCount}
                  </span>
                )}
              </div>
              <h2 className="font-display mt-3 text-base font-bold text-slate-900 dark:text-white">
                Do zapytania wykładowcy
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Prywatna lista pytań oznaczonych jako „trafione fartem”.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <span>{isGuest ? 'Zaloguj się, aby odblokować' : 'Przejrzyj listę'}</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => onStartMode('exam', selectedCategory)}
            className="flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
          >
            <div>
              <div className="flex items-center justify-between">
                <ClipboardCheck className="h-5 w-5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  25 min · ≥85%
                </span>
              </div>
              <h2 className="font-display mt-3 text-base font-bold text-slate-900 dark:text-white">
                Symulacja Egzaminu
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Test 20 lub 32 pytań bez podpowiedzi, z zegarem i przeglądem błędów.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <span>Konfiguruj egzamin</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => onStartMode('quick10', selectedCategory)}
            className="flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
          >
            <div>
              <div className="flex items-center justify-between">
                <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  10 pytań · 3 min
                </span>
              </div>
              <h2 className="font-display mt-3 text-base font-bold text-slate-900 dark:text-white">
                Szybka 10-tka
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Błyskawiczny sprawdzian 10 losowych pytań w 3 minuty.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <span>Startuj teraz</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </button>
        </section>
      )}

      {/* Kafelek rozwijany: Top 20 najtrudniejszych pytań grupy */}
      {totalQuestions > 0 && (
        <section
          aria-label="Top 20 najtrudniejszych pytań grupy"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-400">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    Statystyka grupy
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {selectedLicenseCategory === 'ALL_LICENSES'
                      ? 'Wszystkie kategorie'
                      : formatLicenseCategoryLabel(selectedLicenseCategory)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {topHardestQuestions.length}{' '}
                    {topHardestQuestions.length === 1 ? 'pytanie' : 'pytań'} na liście
                  </span>
                </div>
                <h2 className="font-display mt-1 text-base font-bold text-slate-900 dark:text-white">
                  Top 20 najtrudniejszych pytań grupy
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Pytania, na których kursanci najczęściej popełniają błędy podczas nauki i egzaminów.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setTop20Expanded((v) => !v)}
                aria-expanded={top20Expanded}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {top20Expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    <span>Zwiń listę</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    <span>Rozwiń listę</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={topHardestQuestions.length === 0}
                onClick={() => onPracticeTop20(topHardestQuestions.map((q) => q.id))}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
              >
                <span>Przećwicz tę 20-stkę</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {top20Expanded && (
            <div className="border-t border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/50">
              {topHardestQuestions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-600 dark:text-slate-400">
                  Lista jest jeszcze pusta — buduje się automatycznie na podstawie błędnych odpowiedzi kursantów w trybie Nauki i Egzaminu.
                </div>
              ) : (
                <ol className="divide-y divide-slate-200 dark:divide-slate-800">
                  {topHardestQuestions.map((q, idx) => (
                    <li
                      key={q.id}
                      className="flex items-start justify-between gap-4 px-5 py-3 text-xs"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="font-mono mt-0.5 w-6 shrink-0 font-bold text-slate-400 tabular-nums dark:text-slate-500">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                            {formatLicenseCategoryLabel(q.licenseCategory)} · {q.category}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-sm text-slate-800 dark:text-slate-200">
                            {q.question}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono shrink-0 font-semibold text-red-700 tabular-nums dark:text-red-400">
                        {formatWrongCountLabel(q.wrongCount ?? 0)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>
      )}

      {/* Główny podział: Kategorie nauki + Ranking grupy */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Lewa kolumna: Działy i postępy */}
        <section className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Kategorie nauki i postęp działów
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Kliknij dział, aby wybrać lub uczyć się
            </span>
          </div>

          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {/* Opcja Wszystkie kategorie (Mix) */}
            <div
              className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                selectedCategory === ALL_CATEGORIES_KEY
                  ? 'bg-blue-50/70 dark:bg-blue-950/30'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectCategory(ALL_CATEGORIES_KEY)}
                className="flex flex-1 cursor-pointer flex-col text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {ALL_CATEGORIES_LABEL}
                  </span>
                  {selectedCategory === ALL_CATEGORIES_KEY && (
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                      · Wybrana
                    </span>
                  )}
                </div>
                {isGuest ? (
                  <p className="font-mono mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {totalQuestions} pytań w puli
                  </p>
                ) : (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full bg-blue-700 transition-all dark:bg-blue-500"
                        style={{ width: `${overallMasteryPct}%` }}
                      />
                    </div>
                    <span className="font-mono w-24 text-right text-xs text-slate-600 tabular-nums dark:text-slate-300">
                      {masteredTotal}/{totalQuestions} ({overallMasteryPct}%)
                    </span>
                  </div>
                )}
              </button>

              {totalQuestions > 0 && (
                <button
                  type="button"
                  onClick={() => onStartMode('study', ALL_CATEGORIES_KEY)}
                  className="shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 whitespace-nowrap hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  Ucz się Mix
                </button>
              )}
            </div>

            {categoryRows.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <div
                  key={cat.name}
                  className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCategory(cat.name)}
                    className="flex flex-1 cursor-pointer flex-col text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {cat.name}
                      </span>
                      {isSelected && (
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                          · Wybrana
                        </span>
                      )}
                    </div>
                    {isGuest ? (
                      <p className="font-mono mt-1 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {cat.total} pytań
                      </p>
                    ) : (
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full bg-emerald-600 transition-all dark:bg-emerald-500"
                            style={{ width: `${cat.pct}%` }}
                          />
                        </div>
                        <span className="font-mono w-24 text-right text-xs text-slate-600 tabular-nums dark:text-slate-300">
                          {cat.mastered}/{cat.total} ({cat.pct}%)
                        </span>
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={cat.total === 0}
                    onClick={() => onStartMode('study', cat.name)}
                    className="shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 whitespace-nowrap hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Ucz się
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Prawa kolumna: Ranking uczestników kursu */}
        <section className="space-y-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Ranking uczestników kursu
            </h2>
            {!isGuest && (
              <button
                type="button"
                onClick={() => onStartMode('leaderboard')}
                className="cursor-pointer text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
              >
                Pełny ranking
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {isGuest ? (
              <div className="p-6 text-center">
                <Lock className="mx-auto h-7 w-7 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <h3 className="font-display mt-2.5 text-sm font-bold text-slate-900 dark:text-white">
                  Ranking dostępny po zalogowaniu
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Załóż darmowe konto, aby zbierać punkty, śledzić swoją pozycję w grupie i zapisywać historię egzaminów.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRequireAuth('register')}
                    className="cursor-pointer rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
                  >
                    Załóż darmowe konto
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequireAuth('login')}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    Zaloguj się
                  </button>
                </div>
              </div>
            ) : topLeaderboard.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Brak zapisanych wyników w rankingu. Rozwiąż pierwsze pytania!
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-3 py-2.5">Kursant</th>
                    <th className="px-3 py-2.5 text-right">Opanowane</th>
                    <th className="px-4 py-2.5 text-right">Punkty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {topLeaderboard.map((entry, idx) => {
                    const isSelf = entry.uid === progress.uid;
                    return (
                      <tr
                        key={entry.uid}
                        className={
                          isSelf
                            ? 'bg-blue-50/60 font-semibold dark:bg-blue-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }
                      >
                        <td className="font-mono px-4 py-2.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                          {idx + 1}.
                        </td>
                        <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-900 dark:text-slate-100">
                          {entry.nick} {isSelf ? '(Ty)' : ''}
                        </td>
                        <td className="font-mono px-3 py-2.5 text-right text-slate-700 tabular-nums dark:text-slate-300">
                          {entry.masteredCount}
                        </td>
                        <td className="font-mono px-4 py-2.5 text-right font-semibold text-blue-700 tabular-nums dark:text-blue-400">
                          {entry.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
