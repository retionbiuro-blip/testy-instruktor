import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Headphones,
  Lightbulb,
  Lock,
  Scale,
  Search,
  ShieldCheck,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toggleLessonCompleted } from '../services/firestoreService';
import { Lesson, UserProgress } from '../types';
import { MarkdownContent } from './MarkdownContent';

interface KnowledgeBaseViewProps {
  lessons: Lesson[];
  categories: string[];
  notebookLmUrl?: string;
  progress: UserProgress;
  onProgressChange: (next: UserProgress) => void;
  isGuest: boolean;
  isAdmin: boolean;
  onRequireAuth: (mode: 'login' | 'register') => void;
  onPracticeCategory: (category: string) => void;
  onOpenAdminMaterials: () => void;
  onBackToDashboard: () => void;
}

export function KnowledgeBaseView({
  lessons,
  categories,
  notebookLmUrl,
  progress,
  onProgressChange,
  isGuest,
  isAdmin,
  onRequireAuth,
  onPracticeCategory,
  onOpenAdminMaterials,
  onBackToDashboard
}: KnowledgeBaseViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('__ALL__');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const safeNotebookLmUrl = useMemo(() => {
    const trimmed = notebookLmUrl?.trim() ?? '';
    return /^https?:\/\/.+/i.test(trimmed) ? trimmed : null;
  }, [notebookLmUrl]);

  const completedSet = useMemo(
    () => new Set(progress.completedLessonIds ?? []),
    [progress.completedLessonIds]
  );

  const sortedLessons = useMemo(() => {
    return [...lessons].sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl')
    );
  }, [lessons]);

  const orderedCategoryNames = useMemo(() => {
    const fromLessons = sortedLessons.map((l) => l.category);
    return Array.from(new Set([...categories, ...fromLessons])).filter((cat) =>
      sortedLessons.some((l) => l.category === cat)
    );
  }, [categories, sortedLessons]);

  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedLessons.filter((lesson) => {
      if (selectedCategoryFilter !== '__ALL__' && lesson.category !== selectedCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.legalBasis.toLowerCase().includes(q) ||
        lesson.content.toLowerCase().includes(q) ||
        lesson.keyTakeaways.toLowerCase().includes(q) ||
        lesson.category.toLowerCase().includes(q)
      );
    });
  }, [sortedLessons, selectedCategoryFilter, searchQuery]);

  const groupedLessons = useMemo(() => {
    return orderedCategoryNames
      .map((categoryName) => ({
        category: categoryName,
        items: filteredLessons.filter((l) => l.category === categoryName),
        totalInCategory: sortedLessons.filter((l) => l.category === categoryName).length,
        completedInCategory: sortedLessons.filter(
          (l) => l.category === categoryName && completedSet.has(l.id)
        ).length
      }))
      .filter((group) => group.items.length > 0);
  }, [orderedCategoryNames, filteredLessons, sortedLessons, completedSet]);

  const activeLesson = useMemo(
    () => sortedLessons.find((l) => l.id === activeLessonId) ?? null,
    [sortedLessons, activeLessonId]
  );

  const activeLessonIndex = useMemo(
    () => (activeLesson ? sortedLessons.findIndex((l) => l.id === activeLesson.id) : -1),
    [sortedLessons, activeLesson]
  );

  const totalLessonsCount = sortedLessons.length;
  const completedTotalCount = sortedLessons.filter((l) => completedSet.has(l.id)).length;
  const overallProgressPct =
    totalLessonsCount > 0 ? Math.round((completedTotalCount / totalLessonsCount) * 100) : 0;

  async function handleToggleCompleted(lessonId: string) {
    if (isGuest || togglingId) return;
    setTogglingId(lessonId);
    setActionError(null);
    try {
      const updated = await toggleLessonCompleted(progress, lessonId);
      onProgressChange(updated);
    } catch (err) {
      console.error('Błąd zapisu postępu rozdziału:', err);
      setActionError('Nie udało się zapisać statusu rozdziału. Spróbuj ponownie.');
    } finally {
      setTogglingId(null);
    }
  }

  // Widok dla niezalogowanego gościa (reguły kolekcji lessons wymagają request.auth != null)
  if (isGuest) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Baza Wiedzy / Materiały
            </p>
            <h1 className="font-display mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Teoria, ustawy i Asystent NotebookLM
            </h1>
          </div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Wróć na pulpit</span>
          </button>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Lock className="mx-auto h-9 w-9 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          <h2 className="font-display mt-3 text-lg font-bold text-slate-900 dark:text-white">
            Baza Wiedzy dostępna po zalogowaniu
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Rozdziały z ustaw, podsumowania na egzamin oraz dostęp do Wirtualnego Wykładowcy (NotebookLM) wymagają bezpłatnego konta kursanta, aby system mógł bezpiecznie synchronizować materiały i zapisywać przerobione lekcje.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onRequireAuth('register')}
              className="cursor-pointer rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              Załóż darmowe konto
            </button>
            <button
              type="button"
              onClick={() => onRequireAuth('login')}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Zaloguj się
            </button>
          </div>
        </section>
      </div>
    );
  }

  // Widok szczegółowy pojedynczego rozdziału (Czytelnia)
  if (activeLesson) {
    const isCompleted = completedSet.has(activeLesson.id);
    const prevLesson = activeLessonIndex > 0 ? sortedLessons[activeLessonIndex - 1] : null;
    const nextLesson =
      activeLessonIndex >= 0 && activeLessonIndex < sortedLessons.length - 1
        ? sortedLessons[activeLessonIndex + 1]
        : null;

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveLessonId(null);
              setActionError(null);
            }}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Wróć do spisu materiałów</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPracticeCategory(activeLesson.category)}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-blue-600 bg-blue-50 px-4 text-xs font-semibold text-blue-800 whitespace-nowrap transition-colors hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
            >
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              <span>Przećwicz pytania z tego działu</span>
            </button>
          </div>
        </div>

        <article className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                {activeLesson.category}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Rozdział {String(activeLesson.order).padStart(2, '0')}
              </span>
              {activeLesson.legalBasis && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                    <Scale className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>{activeLesson.legalBasis}</span>
                  </span>
                </>
              )}
              {isCompleted && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Przerobiony</span>
                  </span>
                </>
              )}
            </div>

            <h1
              style={{ textWrap: 'balance' }}
              className="font-display mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
            >
              {activeLesson.title}
            </h1>
          </header>

          <div className="py-6">
            <MarkdownContent content={activeLesson.content} />
          </div>

          {activeLesson.keyTakeaways.trim().length > 0 && (
            <section
              aria-label="Zapamiętaj na egzamin"
              className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6 dark:border-amber-900/60 dark:bg-amber-950/25"
            >
              <div className="mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                <h2 className="font-display text-sm font-bold text-amber-950 dark:text-amber-200">
                  Zapamiętaj na egzamin
                </h2>
              </div>
              <MarkdownContent
                content={activeLesson.keyTakeaways}
                className="text-sm text-amber-950 dark:text-amber-100"
              />
            </section>
          )}

          {actionError && (
            <p role="alert" className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">
              {actionError}
            </p>
          )}

          <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center dark:border-slate-800">
            <button
              type="button"
              disabled={togglingId === activeLesson.id}
              onClick={() => void handleToggleCompleted(activeLesson.id)}
              className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-60 ${
                isCompleted
                  ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>
                {isCompleted
                  ? 'Rozdział przerobiony (kliknij, aby cofnąć)'
                  : 'Oznacz rozdział jako przerobiony'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onPracticeCategory(activeLesson.category)}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <span>Przećwicz pytania z tego działu</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </footer>
        </article>

        {/* Nawigacja między kolejnymi rozdziałami */}
        {(prevLesson || nextLesson) && (
          <nav
            aria-label="Kolejne rozdziały"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {prevLesson ? (
              <button
                type="button"
                onClick={() => {
                  setActiveLessonId(prevLesson.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
              >
                <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Poprzedni rozdział</p>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {prevLesson.title}
                  </p>
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextLesson && (
              <button
                type="button"
                onClick={() => {
                  setActiveLessonId(nextLesson.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex cursor-pointer items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white p-4 text-right transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
              >
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Następny rozdział</p>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {nextLesson.title}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </button>
            )}
          </nav>
        )}
      </div>
    );
  }

  // Widok główny Bazy Wiedzy (NotebookLM + wyszukiwarka + spis rozdziałów)
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Baza Wiedzy / Materiały · {totalLessonsCount}{' '}
            {totalLessonsCount === 1 ? 'rozdział' : 'rozdziałów'} w pamięci lokalnej
          </p>
          <h1
            style={{ textWrap: 'balance' }}
            className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white"
          >
            Teoria, ustawy i materiały do nauki
          </h1>
        </div>

        <button
          type="button"
          onClick={onBackToDashboard}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 whitespace-nowrap hover:bg-slate-100 sm:self-auto dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Wróć na pulpit</span>
        </button>
      </section>

      {/* Sekcja Wirtualny Wykładowca (Google NotebookLM) — widoczna tylko, gdy admin podał URL */}
      {safeNotebookLmUrl && (
        <section
          aria-label="Wirtualny Wykładowca (Google NotebookLM)"
          className="flex flex-col justify-between gap-5 rounded-xl border border-blue-200 bg-blue-50/70 p-6 md:flex-row md:items-center dark:border-blue-900/60 dark:bg-blue-950/30"
        >
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
              <Headphones className="h-4 w-4" aria-hidden="true" />
              <span>Wirtualny Wykładowca · Google NotebookLM</span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Zadawaj pytania z pełnych tekstów ustaw i słuchaj podsumowań audio
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              W naszym wspólnym notatniku Google NotebookLM znajdziesz pełne akty prawne i rozporządzenia dla kandydatów na instruktorów. Możesz zadać dowolne pytanie o przepis lub odtworzyć omówienie audio w drodze.
            </p>
          </div>

          <a
            href={safeNotebookLmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white whitespace-nowrap transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <span>Otwórz Asystenta Ustaw (NotebookLM)</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </section>
      )}

      {/* Pasek postępu i lokalna wyszukiwarka (0 odczytów Firestore) */}
      {totalLessonsCount > 0 && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Twój postęp przerobionych materiałów
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Wyszukiwarka filtruje lokalnie z pamięci przeglądarki bez zużywania limitów bazy.
              </p>
            </div>
            <span className="font-mono text-sm font-bold text-slate-900 tabular-nums dark:text-white">
              {completedTotalCount} / {totalLessonsCount} ({overallProgressPct}%)
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-emerald-600 transition-all dark:bg-emerald-500"
              style={{ width: `${overallProgressPct}%` }}
            />
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj po tytule, podstawie prawnej (np. Art. 33) lub treści rozdziału..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-9 pl-9 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Wyczyść wyszukiwanie"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              aria-label="Filtruj materiały według kategorii"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="__ALL__">Wszystkie kategorie ({totalLessonsCount})</option>
              {orderedCategoryNames.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* Lista rozdziałów pogrupowana kategoriami lub stan pusty */}
      {totalLessonsCount === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <BookOpen className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
          <h2 className="font-display mt-3 text-lg font-bold text-slate-900 dark:text-white">
            Nie dodano jeszcze rozdziałów do Bazy Wiedzy
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-300">
            {isAdmin
              ? 'Jesteś zalogowany jako Administrator. Przejdź do zakładki „Materiały i NotebookLM” w Panelu Admina, aby dodać pierwsze rozdziały z ustaw i podpiąć link do Google NotebookLM.'
              : 'Administrator nie opublikował jeszcze materiałów teoretycznych. Zajrzyj tutaj wkrótce lub sprawdź aktualizacje bazy na pulpicie.'}
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenAdminMaterials}
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span>Dodaj materiały w Panelu Admina</span>
            </button>
          )}
        </section>
      ) : groupedLessons.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Nie znaleziono rozdziałów pasujących do frazy „{searchQuery}”.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategoryFilter('__ALL__');
            }}
            className="mt-3 cursor-pointer text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
          >
            Pokaż wszystkie materiały
          </button>
        </section>
      ) : (
        <div className="space-y-6">
          {groupedLessons.map((group) => (
            <section
              key={group.category}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/70">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {group.category}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono tabular-nums">
                    Przerobiono {group.completedInCategory}/{group.totalInCategory}
                  </span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onPracticeCategory(group.category)}
                    className="cursor-pointer font-semibold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    Ćwicz pytania
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {group.items.map((lesson) => {
                  const isDone = completedSet.has(lesson.id);
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => {
                        setActiveLessonId(lesson.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-slate-50 sm:px-5 dark:hover:bg-slate-800/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-semibold text-slate-600 tabular-nums dark:text-slate-300">
                            {String(lesson.order).padStart(2, '0')}.
                          </span>
                          {lesson.legalBasis && (
                            <>
                              <span>{lesson.legalBasis}</span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span
                            className={
                              isDone
                                ? 'inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }
                          >
                            {isDone && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                            <span>{isDone ? 'Przerobiony' : 'Do przeczytania'}</span>
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                          {lesson.title}
                        </p>
                      </div>

                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-slate-400"
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
