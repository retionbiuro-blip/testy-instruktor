import {
  CheckCircle2,
  ClipboardList,
  Database,
  Edit3,
  Eye,
  ListPlus,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { DEFAULT_EXAM_TOPICS } from '../data/knowledgePracticeData';
import {
  saveExamTopicsToCache,
  setLocalDbVersion,
  setLocalExamTopicsDbVersion
} from '../lib/indexedDb';
import {
  batchImportExamTopics,
  deleteAdminExamTopic,
  generateExamTopicId,
  saveAdminExamTopic
} from '../services/firestoreService';
import { ExamTopic } from '../types';
import { MarkdownContent } from './MarkdownContent';

interface AdminExamTopicsTabProps {
  examTopics: ExamTopic[];
  categories: string[];
  onExamTopicsUpdated: (nextTopics: ExamTopic[], nextVersion: number) => void;
}

const OUTLINE_SKELETON = `### 1. Temat i cel ogólny
- **Temat:** [Wpisz temat zajęć]
- **Cel ogólny:** [Główny cel dydaktyczny i wychowawczy zajęć]

### 2. Cele szczegółowe
**Kategoria wiedzy (poznawcze):**
- Kursant definiuje / wymienia ...
- Kursant rozpoznaje ...

**Kategoria postaw (wychowawcze i BRD):**
- Kursant docenia znaczenie ...
- Kursant kształtuje nawyk ...

### 3. Metody nauczania
- **Podająca:** zwięzły wykład, objaśnienie przepisów.
- **Eksponująca:** pokaz na tablicy / planszach znaków.
- **Problemowa:** analiza przykładu kolizyjnego z grupą.

### 4. Środki dydaktyczne
- Tablica suchościeralna / magnetyczna, plansze, modele pojazdów, Ustawa Prawo o ruchu drogowym.

### 5. Przebieg zajęć (15 min)
- **Wstęp (2 min):** Powitanie, krótkie pytanie wprowadzające, podanie tematu i celów.
- **Część główna (11 min):**
  - *Min 3–6:* Omówienie podstawy prawnej i definicji.
  - *Min 7–11:* Przykłady praktyczne i najczęstsze błędy.
  - *Min 12–13:* Pytanie problemowe do słuchaczy.
- **Podsumowanie (2 min):** Powtórzenie najważniejszych wniosków i 2 pytania kontrolne.`;

function stripLeadingListNumbering(line: string): string {
  return line
    .replace(/^\s*\d+[.)\]:-]\s+/, '')
    .replace(/^\s*[-*•]\s+/, '')
    .trim();
}

export function AdminExamTopicsTab({
  examTopics,
  categories,
  onExamTopicsUpdated
}: AdminExamTopicsTabProps) {
  const isUsingBuiltInDefaults = examTopics.length === 0;
  const effectiveTopics = useMemo(() => {
    const source = isUsingBuiltInDefaults ? DEFAULT_EXAM_TOPICS : examTopics;
    return [...source].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl'));
  }, [examTopics, isUsingBuiltInDefaults]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>([
      'Przepisy ruchu drogowego',
      'Technika kierowania i manewry',
      'Pierwsza pomoc i BRD',
      'Dydaktyka i psychologia',
      'Szkolenie motocyklowe i ciężarowe',
      ...categories,
      ...effectiveTopics.map((t) => t.category)
    ]);
    return Array.from(set).filter(Boolean);
  }, [categories, effectiveTopics]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('__ALL__');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  // Stan edytora pojedynczego tematu
  const [editingTopic, setEditingTopic] = useState<ExamTopic | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editorPreviewMode, setEditorPreviewMode] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Stan modal hurtowego wklejania listy tematów
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('Przepisy ruchu drogowego');
  const [bulkTips, setBulkTips] = useState('');
  const [bulkStartOrder, setBulkStartOrder] = useState<number>(1);
  const [bulkStripNumbering, setBulkStripNumbering] = useState(true);
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkModalError, setBulkModalError] = useState<string | null>(null);

  // Stan usuwania
  const [deletingTopic, setDeletingTopic] = useState<ExamTopic | null>(null);
  const [processingDelete, setProcessingDelete] = useState(false);

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return effectiveTopics.filter((t) => {
      if (filterCategory !== '__ALL__' && t.category !== filterCategory) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.commissionTips.toLowerCase().includes(q) ||
        t.sampleOutline.toLowerCase().includes(q)
      );
    });
  }, [effectiveTopics, filterCategory, searchQuery]);

  const parsedBulkTitles = useMemo(() => {
    return bulkRawText
      .split(/\r?\n/)
      .map((line) => (bulkStripNumbering ? stripLeadingListNumbering(line) : line.trim()))
      .filter((line) => line.length > 0);
  }, [bulkRawText, bulkStripNumbering]);

  async function syncLocalAndNotify(nextList: ExamTopic[], nextVersion: number) {
    const sorted = [...nextList].sort(
      (a, b) => a.order - b.order || a.title.localeCompare(b.title, 'pl')
    );
    await saveExamTopicsToCache(sorted);
    setLocalDbVersion(nextVersion);
    setLocalExamTopicsDbVersion(nextVersion);
    onExamTopicsUpdated(sorted, nextVersion);
  }

  async function handleSeedDefaultsNow() {
    setSeedingDefaults(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const nextVersion = await batchImportExamTopics(DEFAULT_EXAM_TOPICS);
      await syncLocalAndNotify(DEFAULT_EXAM_TOPICS, nextVersion);
      setStatusMessage(
        `Zapisano ${DEFAULT_EXAM_TOPICS.length} domyślnych tematów wraz ze wzorami konspektów do Firestore (wersja bazy v${nextVersion}).`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Nie udało się zapisać domyślnych tematów.'
      );
    } finally {
      setSeedingDefaults(false);
    }
  }

  function openNewTopicModal() {
    const maxOrder = effectiveTopics.reduce((max, t) => Math.max(max, t.order), 0);
    setIsCreatingNew(true);
    setEditorPreviewMode(false);
    setEditorError(null);
    setEditingTopic({
      id: generateExamTopicId(0),
      category:
        filterCategory !== '__ALL__'
          ? filterCategory
          : availableCategories[0] ?? 'Przepisy ruchu drogowego',
      title: '',
      commissionTips: '',
      sampleOutline: '',
      order: maxOrder + 1
    });
  }

  function openEditTopicModal(topic: ExamTopic) {
    setIsCreatingNew(false);
    setEditorPreviewMode(false);
    setEditorError(null);
    setEditingTopic({ ...topic });
  }

  function openBulkModal() {
    const maxOrder = effectiveTopics.reduce((max, t) => Math.max(max, t.order), 0);
    setBulkCategory(
      filterCategory !== '__ALL__'
        ? filterCategory
        : availableCategories[0] ?? 'Przepisy ruchu drogowego'
    );
    setBulkTips('');
    setBulkStartOrder(maxOrder + 1);
    setBulkStripNumbering(true);
    setBulkRawText('');
    setBulkModalError(null);
    setBulkModalOpen(true);
  }

  async function handleSaveTopic(e: FormEvent) {
    e.preventDefault();
    if (!editingTopic) return;
    if (!editingTopic.title.trim()) {
      setEditorError('Podaj tytuł tematu egzaminacyjnego.');
      return;
    }
    if (!editingTopic.category.trim()) {
      setEditorError('Wybierz lub wpisz kategorię tematu.');
      return;
    }

    setSavingTopic(true);
    setEditorError(null);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const cleaned: ExamTopic = {
        ...editingTopic,
        category: editingTopic.category.trim(),
        title: editingTopic.title.trim(),
        commissionTips: editingTopic.commissionTips.trim(),
        sampleOutline: editingTopic.sampleOutline.trim(),
        order: Number.isFinite(Number(editingTopic.order))
          ? Math.max(0, Math.round(Number(editingTopic.order)))
          : 1
      };

      let nextTopics: ExamTopic[];
      let nextVersion: number;

      if (isUsingBuiltInDefaults) {
        // Pierwszy zapis: zachowujemy pozostałe 15 domyślnych tematów w Firestore, aby nic nie zniknęło
        nextTopics = isCreatingNew
          ? [...DEFAULT_EXAM_TOPICS, cleaned]
          : DEFAULT_EXAM_TOPICS.map((t) => (t.id === cleaned.id ? cleaned : t));
        nextVersion = await batchImportExamTopics(nextTopics);
      } else {
        nextVersion = await saveAdminExamTopic(cleaned, isCreatingNew);
        nextTopics = isCreatingNew
          ? [...examTopics, cleaned]
          : examTopics.map((t) => (t.id === cleaned.id ? cleaned : t));
      }

      await syncLocalAndNotify(nextTopics, nextVersion);
      setStatusMessage(
        isCreatingNew
          ? `Dodano temat „${cleaned.title}” (wersja bazy v${nextVersion}).`
          : `Zaktualizowano temat „${cleaned.title}” (wersja bazy v${nextVersion}).`
      );
      setEditingTopic(null);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Nie udało się zapisać tematu.');
    } finally {
      setSavingTopic(false);
    }
  }

  async function handleCommitBulkImport(e: FormEvent) {
    e.preventDefault();
    if (parsedBulkTitles.length === 0) {
      setBulkModalError('Wklej przynajmniej jedną linię z tytułem tematu.');
      return;
    }
    const cleanCat = bulkCategory.trim() || 'Przepisy ruchu drogowego';
    const startOrderNum = Number.isFinite(Number(bulkStartOrder))
      ? Math.max(0, Math.round(Number(bulkStartOrder)))
      : 1;

    setBulkSaving(true);
    setBulkModalError(null);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const newItems: ExamTopic[] = parsedBulkTitles.map((title, idx) => ({
        id: generateExamTopicId(idx),
        category: cleanCat.slice(0, 120),
        title: title.slice(0, 400),
        commissionTips: bulkTips.trim().slice(0, 2000),
        sampleOutline: '',
        order: startOrderNum + idx
      }));

      const itemsToWrite = isUsingBuiltInDefaults
        ? [...DEFAULT_EXAM_TOPICS, ...newItems]
        : newItems;
      const nextVersion = await batchImportExamTopics(itemsToWrite);
      const nextAll = isUsingBuiltInDefaults
        ? [...DEFAULT_EXAM_TOPICS, ...newItems]
        : [...examTopics, ...newItems];

      await syncLocalAndNotify(nextAll, nextVersion);
      setStatusMessage(
        `Dodano hurtowo ${newItems.length} tematów egzaminacyjnych do działu „${cleanCat}” (wersja bazy v${nextVersion}).`
      );
      setBulkModalOpen(false);
    } catch (err) {
      setBulkModalError(
        err instanceof Error ? err.message : 'Nie udało się zaimportować listy tematów.'
      );
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTopic) return;
    setProcessingDelete(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      let nextTopics: ExamTopic[];
      let nextVersion: number;

      if (isUsingBuiltInDefaults) {
        nextTopics = DEFAULT_EXAM_TOPICS.filter((t) => t.id !== deletingTopic.id);
        nextVersion =
          nextTopics.length > 0
            ? await batchImportExamTopics(nextTopics)
            : await deleteAdminExamTopic(deletingTopic.id);
      } else {
        nextVersion = await deleteAdminExamTopic(deletingTopic.id);
        nextTopics = examTopics.filter((t) => t.id !== deletingTopic.id);
      }

      await syncLocalAndNotify(nextTopics, nextVersion);
      setStatusMessage(
        `Usunięto temat „${deletingTopic.title}” i podbito wersję bazy do v${nextVersion}.`
      );
      setDeletingTopic(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Nie udało się usunąć tematu.');
    } finally {
      setProcessingDelete(false);
    }
  }

  const withOutlineCount = effectiveTopics.filter((t) => t.sampleOutline.trim().length > 0).length;

  return (
    <section className="space-y-6">
      {/* Baner informacyjny gdy w Firestore nie zapisano jeszcze tematów */}
      {isUsingBuiltInDefaults && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50/70 p-5 sm:flex-row sm:items-center dark:border-blue-900/60 dark:bg-blue-950/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
              <Database className="h-4 w-4" aria-hidden="true" />
              <span>Wbudowane tematy domyślne ({DEFAULT_EXAM_TOPICS.length})</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              Kursanci widzą obecnie 16 wbudowanych tematów z gotowymi wzorami konspektów. Możesz zapisać je do kolekcji <code className="font-mono">examTopics</code> w Firestore jednym kliknięciem albo od razu dodać/edytować dowolny temat (zestaw startowy zapisze się automatycznie w tle).
            </p>
          </div>
          <button
            type="button"
            disabled={seedingDefaults}
            onClick={() => void handleSeedDefaultsNow()}
            className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white whitespace-nowrap hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {seedingDefaults ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Zapisz 16 domyślnych tematów do Firestore</span>
          </button>
        </div>
      )}

      {/* Pasek narzędzi i filtrów */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj tematu po tytule, kategorii lub treści konspektu..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <select
            aria-label="Filtruj tematy po kategorii"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="__ALL__">Wszystkie kategorie ({effectiveTopics.length})</option>
            {availableCategories
              .filter((cat) => effectiveTopics.some((t) => t.category === cat))
              .map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openBulkModal}
            className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 px-3.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
          >
            <ListPlus className="h-4 w-4" aria-hidden="true" />
            <span>Wklej listę tematów (hurtowo)</span>
          </button>

          <button
            type="button"
            onClick={openNewTopicModal}
            className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Dodaj temat</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="cursor-pointer text-emerald-700 hover:text-emerald-950 dark:text-emerald-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="cursor-pointer text-red-700 hover:text-red-950 dark:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Lista tematów */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
          <span>
            Widoczne tematy: <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{filteredTopics.length}</strong> z {effectiveTopics.length}
          </span>
          <span className="font-mono tabular-nums">
            Z gotowym wzorem konspektu: {withOutlineCount}/{effectiveTopics.length}
          </span>
        </div>

        {filteredTopics.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            <ClipboardList className="mx-auto mb-2 h-8 w-8 text-slate-400" aria-hidden="true" />
            <p>Brak tematów spełniających wybrane kryteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredTopics.map((topic) => {
              const hasOutline = topic.sampleOutline.trim().length > 0;
              return (
                <div
                  key={topic.id}
                  className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-start sm:px-5"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-bold text-slate-700 tabular-nums dark:text-slate-300">
                        #{String(topic.order).padStart(2, '0')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        {topic.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          hasOutline
                            ? 'inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }
                      >
                        {hasOutline && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span>
                          {hasOutline ? 'Wzór konspektu gotowy' : 'Brak wzoru (sam temat)'}
                        </span>
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {topic.title}
                    </p>

                    {topic.commissionTips && (
                      <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                        <strong>Wskazówki:</strong> {topic.commissionTips}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditTopicModal(topic)}
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Edytuj</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTopic(topic)}
                      aria-label={`Usuń temat: ${topic.title}`}
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/60"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Usuń</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal dodawania / edycji pojedynczego tematu */}
      {editingTopic && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-topic-editor-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={handleSaveTopic}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2
                id="exam-topic-editor-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                {isCreatingNew ? 'Nowy temat egzaminacyjny' : 'Edycja tematu i wzoru konspektu'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingTopic(null)}
                aria-label="Zamknij edytor"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="topic-category"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Kategoria / dział tematyczny
                  </label>
                  <input
                    id="topic-category"
                    type="text"
                    list="exam-topic-categories-list"
                    value={editingTopic.category}
                    onChange={(e) =>
                      setEditingTopic({ ...editingTopic, category: e.target.value })
                    }
                    placeholder="np. Przepisy ruchu drogowego"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <datalist id="exam-topic-categories-list">
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label
                    htmlFor="topic-order"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Kolejność na liście
                  </label>
                  <input
                    id="topic-order"
                    type="number"
                    min={0}
                    max={10000}
                    value={editingTopic.order}
                    onChange={(e) =>
                      setEditingTopic({
                        ...editingTopic,
                        order: Number(e.target.value)
                      })
                    }
                    className="font-mono h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="topic-title"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Pełny tytuł tematu wylosowanego na egzaminie
                </label>
                <textarea
                  id="topic-title"
                  rows={2}
                  value={editingTopic.title}
                  onChange={(e) => setEditingTopic({ ...editingTopic, title: e.target.value })}
                  placeholder="np. Zasady pierwszeństwa na skrzyżowaniach równorzędnych..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="topic-tips"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Na co zwraca uwagę komisja (wskazówki dla zdającego)
                </label>
                <textarea
                  id="topic-tips"
                  rows={2}
                  value={editingTopic.commissionTips}
                  onChange={(e) =>
                    setEditingTopic({ ...editingTopic, commissionTips: e.target.value })
                  }
                  placeholder="np. Omów obowiązek zachowania szczególnej ostrożności, znaki A-7 i B-20 oraz wyjątek pojazdu szynowego..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="topic-outline"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Wzorcowy konspekt lekcji (Markdown: cel ogólny, cele szczegółowe, metody, środki, przebieg w minutach)
                  </label>
                  <div className="flex items-center gap-2">
                    {!editingTopic.sampleOutline.trim() && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingTopic({
                            ...editingTopic,
                            sampleOutline: OUTLINE_SKELETON.replace(
                              '[Wpisz temat zajęć]',
                              editingTopic.title.trim() || '[Wpisz temat zajęć]'
                            )
                          })
                        }
                        className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Wstaw szablon 5-punktowy
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditorPreviewMode((v) => !v)}
                      className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-400"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{editorPreviewMode ? 'Wróć do edycji' : 'Podgląd Markdown'}</span>
                    </button>
                  </div>
                </div>

                {editorPreviewMode ? (
                  <div className="min-h-[240px] rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    {editingTopic.sampleOutline.trim() ? (
                      <MarkdownContent content={editingTopic.sampleOutline} />
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Brak treści wzorcowego konspektu do wyświetlenia.
                      </p>
                    )}
                  </div>
                ) : (
                  <textarea
                    id="topic-outline"
                    rows={11}
                    value={editingTopic.sampleOutline}
                    onChange={(e) =>
                      setEditingTopic({ ...editingTopic, sampleOutline: e.target.value })
                    }
                    placeholder="Wpisz pełny wzorcowy konspekt w formacie Markdown (opcjonalne — jeśli zostawisz puste, temat nadal będzie dostępny do losowania w Części II Egzaminu)..."
                    className="font-mono w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                )}
              </div>

              {editorError && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {editorError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                disabled={savingTopic}
                onClick={() => setEditingTopic(null)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={savingTopic}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600"
              >
                {savingTopic && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Zapisz temat i opublikuj</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal hurtowego wklejania listy tematów */}
      {bulkModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-topics-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={handleCommitBulkImport}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h2
                  id="bulk-topics-title"
                  className="font-display text-lg font-bold text-slate-900 dark:text-white"
                >
                  Wklej listę tematów hurtowo
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Każda niepusta linia zostanie dodana jako osobny temat egzaminacyjny w kolekcji examTopics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                aria-label="Zamknij okno importu listy"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="bulk-topic-category"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Wspólna kategoria dla wklejanych tematów
                  </label>
                  <input
                    id="bulk-topic-category"
                    type="text"
                    list="exam-topic-categories-list"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="bulk-start-order"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Numer początkowy
                  </label>
                  <input
                    id="bulk-start-order"
                    type="number"
                    min={0}
                    max={10000}
                    value={bulkStartOrder}
                    onChange={(e) => setBulkStartOrder(Number(e.target.value))}
                    className="font-mono h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="bulk-default-tips"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Opcjonalna wspólna wskazówka komisji (możesz później uzupełnić osobno)
                </label>
                <input
                  id="bulk-default-tips"
                  type="text"
                  value={bulkTips}
                  onChange={(e) => setBulkTips(e.target.value)}
                  placeholder="np. Zwróć uwagę na podstawę prawną, przykład praktyczny oraz pytania kontrolne..."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="bulk-topics-textarea"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Lista tematów (jeden temat w jednej linii)
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={bulkStripNumbering}
                      onChange={(e) => setBulkStripNumbering(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-700"
                    />
                    <span>Usuwaj numerację na początku linii (np. „1. ”)</span>
                  </label>
                </div>

                <textarea
                  id="bulk-topics-textarea"
                  rows={8}
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  placeholder={`1. Zasady wyprzedzania i omijania w warunkach ograniczonej widoczności\n2. Przewóz dzieci w fotelikach bezpieczeństwa\n3. Rola instruktora w kształtowaniu zachowań defensywnych`}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <p className="font-mono mt-1.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                  Wykryto tematów do dodania: {parsedBulkTitles.length}
                </p>
              </div>

              {bulkModalError && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {bulkModalError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => setBulkModalOpen(false)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={bulkSaving || parsedBulkTitles.length === 0}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 dark:bg-blue-600"
              >
                {bulkSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Dodaj {parsedBulkTitles.length} tematów do Firestore</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia */}
      {deletingTopic && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-topic-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2
              id="delete-topic-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              Usuń temat egzaminacyjny
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Czy na pewno chcesz trwale usunąć temat „{deletingTopic.title}” wraz z jego wzorem konspektu?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={processingDelete}
                onClick={() => setDeletingTopic(null)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={processingDelete}
                onClick={() => void handleConfirmDelete()}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60 dark:bg-red-600"
              >
                {processingDelete && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Usuń trwale</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
