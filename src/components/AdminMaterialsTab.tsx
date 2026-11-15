import {
  BookOpen,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  Headphones,
  Loader2,
  Plus,
  Scale,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  saveLessonsToCache,
  setLocalDbVersion,
  setLocalLessonsDbVersion
} from '../lib/indexedDb';
import {
  deleteAdminLesson,
  generateLessonId,
  saveAdminLesson,
  saveAdminNotebookLmUrl
} from '../services/firestoreService';
import { Lesson } from '../types';
import { MarkdownContent } from './MarkdownContent';

interface AdminMaterialsTabProps {
  lessons: Lesson[];
  categories: string[];
  notebookLmUrl?: string;
  onLessonsUpdated: (nextLessons: Lesson[], nextCategories: string[], nextVersion: number) => void;
  onNotebookLmUpdated: (nextUrl: string | undefined, nextVersion: number) => void;
}

export function AdminMaterialsTab({
  lessons,
  categories,
  notebookLmUrl,
  onLessonsUpdated,
  onNotebookLmUpdated
}: AdminMaterialsTabProps) {
  // Stan dla Google NotebookLM
  const [lmInput, setLmInput] = useState(notebookLmUrl ?? '');
  const [savingLm, setSavingLm] = useState(false);
  const [lmMessage, setLmMessage] = useState<string | null>(null);
  const [lmError, setLmError] = useState<string | null>(null);

  useEffect(() => {
    setLmInput(notebookLmUrl ?? '');
  }, [notebookLmUrl]);

  // Stan dla listy i edytora rozdziałów
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('__ALL__');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editorPreviewMode, setEditorPreviewMode] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonStatus, setLessonStatus] = useState<string | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [processingDelete, setProcessingDelete] = useState(false);

  const sortedLessons = useMemo(() => {
    return [...lessons].sort(
      (a, b) =>
        a.category.localeCompare(b.category, 'pl') ||
        a.order - b.order ||
        a.title.localeCompare(b.title, 'pl')
    );
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedLessons.filter((lesson) => {
      if (filterCategory !== '__ALL__' && lesson.category !== filterCategory) return false;
      if (!q) return true;
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.legalBasis.toLowerCase().includes(q) ||
        lesson.category.toLowerCase().includes(q) ||
        lesson.content.toLowerCase().includes(q)
      );
    });
  }, [sortedLessons, filterCategory, searchQuery]);

  async function handleSaveNotebookLm(e: FormEvent) {
    e.preventDefault();
    setSavingLm(true);
    setLmMessage(null);
    setLmError(null);
    try {
      const res = await saveAdminNotebookLmUrl(lmInput);
      setLocalDbVersion(res.nextVersion);
      setLocalLessonsDbVersion(res.nextVersion);
      onNotebookLmUpdated(res.notebookLmUrl, res.nextVersion);
      setLmMessage(
        res.notebookLmUrl
          ? `Zapisano link do Google NotebookLM i podbito wersję bazy do v${res.nextVersion}.`
          : `Usunięto link do Google NotebookLM i podbito wersję bazy do v${res.nextVersion}.`
      );
    } catch (err) {
      setLmError(err instanceof Error ? err.message : 'Nie udało się zapisać linku NotebookLM.');
    } finally {
      setSavingLm(false);
    }
  }

  async function handleClearNotebookLm() {
    setLmInput('');
    setSavingLm(true);
    setLmMessage(null);
    setLmError(null);
    try {
      const res = await saveAdminNotebookLmUrl('');
      setLocalDbVersion(res.nextVersion);
      setLocalLessonsDbVersion(res.nextVersion);
      onNotebookLmUpdated(undefined, res.nextVersion);
      setLmMessage(`Ukryto kartę NotebookLM (wersja bazy v${res.nextVersion}).`);
    } catch (err) {
      setLmError(err instanceof Error ? err.message : 'Błąd podczas usuwania linku.');
    } finally {
      setSavingLm(false);
    }
  }

  function openNewLessonModal() {
    const defaultCat =
      filterCategory !== '__ALL__' ? filterCategory : categories[0] ?? 'Prawo o ruchu drogowym';
    const maxOrderInCat = lessons
      .filter((l) => l.category === defaultCat)
      .reduce((max, l) => Math.max(max, l.order), 0);

    setIsCreatingNew(true);
    setEditorPreviewMode(false);
    setLessonError(null);
    setEditingLesson({
      id: generateLessonId(),
      category: defaultCat,
      title: '',
      order: maxOrderInCat + 1,
      legalBasis: '',
      content: '',
      keyTakeaways: ''
    });
  }

  function openSampleLessonModal() {
    const defaultCat = categories[0] ?? 'Prawo o ruchu drogowym';
    const maxOrder = lessons.reduce((max, l) => Math.max(max, l.order), 0);
    setIsCreatingNew(true);
    setEditorPreviewMode(false);
    setLessonError(null);
    setEditingLesson({
      id: generateLessonId(),
      category: defaultCat,
      title: 'Wymagania wobec instruktora i prowadzenie zajęć teoretycznych',
      order: maxOrder + 1,
      legalBasis: 'Art. 33–39 Ustawy o kierujących pojazdami',
      content: `# Najważniejsze zasady prawne\n\nKandydat na instruktora nauki jazdy musi spełniać ściśle określone wymagania ustawowe.\n\n## Kluczowe warunki wpisu do ewidencji\n\n- **Posiadanie odpowiedniego prawa jazdy** kategorii objętej szkoleniem przez wymagany okres.\n- **Brak skazania** prawomocnym wyrokiem za przestępstwa określone w art. 33 ust. 1 pkt 8 ustawy.\n- **Orzeczenie lekarskie i psychologiczne** potwierdzające brak przeciwwskazań.\n\n## Dokumentacja podczas szkolenia\n\n1. Karta przeprowadzonych zajęć musi być wypełniana na bieżąco.\n2. Instruktor odpowiada za bezpieczeństwo podczas szkolenia praktycznego.`,
      keyTakeaways: `- Zapamiętaj dokładnie wymagany staż posiadania prawa jazdy dla danej kategorii.\n- Zwróć uwagę na **różnicę** między zawieszeniem a wykreśleniem z ewidencji instruktorów.`
    });
  }

  function openEditLessonModal(lesson: Lesson) {
    setIsCreatingNew(false);
    setEditorPreviewMode(false);
    setLessonError(null);
    setEditingLesson({ ...lesson });
  }

  async function handleSaveLesson(e: FormEvent) {
    e.preventDefault();
    if (!editingLesson) return;
    if (!editingLesson.title.trim()) {
      setLessonError('Podaj tytuł rozdziału.');
      return;
    }
    if (!editingLesson.category.trim()) {
      setLessonError('Wybierz lub wpisz kategorię.');
      return;
    }
    if (!editingLesson.content.trim()) {
      setLessonError('Wpisz treść merytoryczną rozdziału.');
      return;
    }

    setSavingLesson(true);
    setLessonError(null);
    setLessonStatus(null);
    try {
      const cleanedLesson: Lesson = {
        ...editingLesson,
        category: editingLesson.category.trim(),
        title: editingLesson.title.trim(),
        order: Number.isFinite(Number(editingLesson.order))
          ? Math.max(0, Math.round(Number(editingLesson.order)))
          : 1,
        legalBasis: editingLesson.legalBasis.trim(),
        content: editingLesson.content.trim(),
        keyTakeaways: editingLesson.keyTakeaways.trim()
      };

      const res = await saveAdminLesson(cleanedLesson, isCreatingNew, categories);
      const nextLessons = isCreatingNew
        ? [...lessons, cleanedLesson]
        : lessons.map((l) => (l.id === cleanedLesson.id ? cleanedLesson : l));
      nextLessons.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl'));

      await saveLessonsToCache(nextLessons);
      setLocalDbVersion(res.nextVersion);
      setLocalLessonsDbVersion(res.nextVersion);
      onLessonsUpdated(nextLessons, res.nextCategories, res.nextVersion);
      setLessonStatus(
        isCreatingNew
          ? `Dodano rozdział „${cleanedLesson.title}” (wersja bazy v${res.nextVersion}).`
          : `Zaktualizowano rozdział „${cleanedLesson.title}” (wersja bazy v${res.nextVersion}).`
      );
      setEditingLesson(null);
    } catch (err) {
      setLessonError(err instanceof Error ? err.message : 'Nie udało się zapisać rozdziału.');
    } finally {
      setSavingLesson(false);
    }
  }

  async function handleConfirmDeleteLesson() {
    if (!deletingLesson) return;
    setProcessingDelete(true);
    setLessonStatus(null);
    setLessonError(null);
    try {
      const nextVersion = await deleteAdminLesson(deletingLesson.id);
      const nextLessons = lessons.filter((l) => l.id !== deletingLesson.id);
      await saveLessonsToCache(nextLessons);
      setLocalDbVersion(nextVersion);
      setLocalLessonsDbVersion(nextVersion);
      onLessonsUpdated(nextLessons, categories, nextVersion);
      setLessonStatus(
        `Usunięto rozdział „${deletingLesson.title}” i podbito wersję bazy do v${nextVersion}.`
      );
      setDeletingLesson(null);
    } catch (err) {
      setLessonError(err instanceof Error ? err.message : 'Nie udało się usunąć rozdziału.');
    } finally {
      setProcessingDelete(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* Karta 1: Link do Google NotebookLM */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <Headphones className="h-4 w-4" aria-hidden="true" />
              <span>Wirtualny Wykładowca (Google NotebookLM)</span>
            </div>
            <h2 className="font-display mt-1 text-lg font-bold text-slate-900 dark:text-white">
              Link do wspólnego notatnika z ustawami
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Wklej publiczny link udostępniania ze swojego Google NotebookLM. Gdy pole jest puste, karta asystenta pozostaje ukryta przed kursantami. Zapis automatycznie podbija <span className="font-mono">dbVersion</span> o 1.
            </p>
          </div>

          {notebookLmUrl && /^https?:\/\/.+/i.test(notebookLmUrl) && (
            <a
              href={notebookLmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span>Testuj link</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>

        <form onSubmit={handleSaveNotebookLm} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={lmInput}
            onChange={(e) => setLmInput(e.target.value)}
            maxLength={1000}
            placeholder="https://notebooklm.google.com/notebook/..."
            className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={savingLm}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white whitespace-nowrap hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600"
            >
              {savingLm && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Zapisz link NotebookLM</span>
            </button>
            {notebookLmUrl && (
              <button
                type="button"
                disabled={savingLm}
                onClick={() => void handleClearNotebookLm()}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-red-700 whitespace-nowrap hover:bg-red-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Usuń link</span>
              </button>
            )}
          </div>
        </form>

        {lmMessage && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{lmMessage}</span>
          </p>
        )}
        {lmError && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">{lmError}</p>
        )}
      </div>

      {/* Karta 2: Rozdziały Bazy Wiedzy (kolekcja lessons) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Rozdziały Bazy Wiedzy ({lessons.length})
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Dodawaj i edytuj opracowania z podstawami prawnymi i ramką „Zapamiętaj na egzamin”. Każda zmiana podbija <span className="font-mono">dbVersion</span> o 1.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openSampleLessonModal}
              className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Wstaw szablon rozdziału</span>
            </button>
            <button
              type="button"
              onClick={openNewLessonModal}
              className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white whitespace-nowrap hover:bg-blue-800 dark:bg-blue-600"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Dodaj rozdział</span>
            </button>
          </div>
        </div>

        {lessonStatus && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <span>{lessonStatus}</span>
            <button
              type="button"
              onClick={() => setLessonStatus(null)}
              className="cursor-pointer text-emerald-700 dark:text-emerald-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj rozdziału po tytule lub podstawie prawnej..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="__ALL__">Wszystkie kategorie</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {filteredLessons.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {lessons.length === 0
                ? 'Brak dodanych rozdziałów. Kliknij „Dodaj rozdział” lub „Wstaw szablon rozdziału”.'
                : 'Brak rozdziałów spełniających kryteria filtrowania.'}
            </div>
          ) : (
            filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      {lesson.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Kolejność: {lesson.order}
                    </span>
                    {lesson.legalBasis && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Scale className="h-3 w-3" aria-hidden="true" />
                          <span>{lesson.legalBasis}</span>
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {lesson.title}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditLessonModal(lesson)}
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edytuj</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingLesson(lesson)}
                    aria-label={`Usuń rozdział ${lesson.title}`}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal dodawania / edycji rozdziału */}
      {editingLesson && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                {isCreatingNew ? 'Dodaj nowy rozdział Bazy Wiedzy' : 'Edytuj rozdział Bazy Wiedzy'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingLesson(null)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kategoria (powiązana z testami)
                  </label>
                  <input
                    list="lesson-categories-datalist"
                    required
                    maxLength={120}
                    value={editingLesson.category}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, category: e.target.value })
                    }
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <datalist id="lesson-categories-datalist">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kolejność (order)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    required
                    value={editingLesson.order}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        order: Number(e.target.value)
                      })
                    }
                    className="font-mono h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tytuł rozdziału
                </label>
                <input
                  type="text"
                  required
                  maxLength={250}
                  value={editingLesson.title}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, title: e.target.value })
                  }
                  placeholder="np. Uprawnienia instruktora i nadzór starosty"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Podstawa prawna (legalBasis)
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={editingLesson.legalBasis}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, legalBasis: e.target.value })
                  }
                  placeholder="np. Art. 33–39 Ustawy o kierujących pojazdami"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Treść rozdziału (obsługa Markdown)
                  </label>
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditorPreviewMode(false)}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold ${
                        !editorPreviewMode
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Edycja tekstu
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorPreviewMode(true)}
                      className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                        editorPreviewMode
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Eye className="h-3 w-3" aria-hidden="true" />
                      <span>Podgląd</span>
                    </button>
                  </div>
                </div>

                <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Składnia: <span className="font-mono"># Nagłówek</span> ·{' '}
                  <span className="font-mono">## Podtytuł</span> ·{' '}
                  <span className="font-mono">**pogrubienie**</span> ·{' '}
                  <span className="font-mono">- punkt listy</span> ·{' '}
                  <span className="font-mono">1. lista numerowana</span>
                </p>

                {editorPreviewMode ? (
                  <div className="min-h-[220px] rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    {editingLesson.content.trim() ? (
                      <MarkdownContent content={editingLesson.content} />
                    ) : (
                      <p className="text-xs text-slate-400">Brak treści do podglądu.</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    rows={9}
                    required
                    maxLength={50000}
                    value={editingLesson.content}
                    onChange={(e) =>
                      setEditingLesson({ ...editingLesson, content: e.target.value })
                    }
                    placeholder="# Tytuł sekcji&#10;&#10;Treść opracowania...&#10;&#10;- **Ważna zasada:** opis..."
                    className="font-mono w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ramka „Zapamiętaj na egzamin” (keyTakeaways)
                </label>
                <textarea
                  rows={3}
                  maxLength={8000}
                  value={editingLesson.keyTakeaways}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, keyTakeaways: e.target.value })
                  }
                  placeholder="- Kluczowa liczba / termin do zapamiętania&#10;- Najczęstsza pułapka na egzaminie państwowym"
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {lessonError && (
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {lessonError}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={savingLesson}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600"
                >
                  {savingLesson && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Zapisz rozdział i podbij wersję bazy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia rozdziału */}
      {deletingLesson && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Usuń rozdział z Bazy Wiedzy
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Czy na pewno chcesz trwale usunąć rozdział „{deletingLesson.title}”? Po usunięciu wersja bazy (<span className="font-mono">dbVersion</span>) wzrośnie o 1.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={processingDelete}
                onClick={() => setDeletingLesson(null)}
                className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={processingDelete}
                onClick={() => void handleConfirmDeleteLesson()}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60 dark:bg-red-600"
              >
                {processingDelete && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Usuń rozdział</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
