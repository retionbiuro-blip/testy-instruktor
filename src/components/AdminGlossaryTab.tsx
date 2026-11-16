import {
  BookOpen,
  Database,
  Edit3,
  ListPlus,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { DIDACTICS_GLOSSARY } from '../data/knowledgePracticeData';
import {
  saveGlossaryTermsToCache,
  setLocalDbVersion,
  setLocalGlossaryTermsDbVersion
} from '../lib/indexedDb';
import {
  batchImportGlossaryTerms,
  deleteAdminGlossaryTerm,
  generateGlossaryTermId,
  saveAdminGlossaryTerm
} from '../services/firestoreService';
import { GlossaryTerm } from '../types';

interface AdminGlossaryTabProps {
  glossaryTerms: GlossaryTerm[];
  onGlossaryTermsUpdated: (nextTerms: GlossaryTerm[], nextVersion: number) => void;
}

const STANDARD_GLOSSARY_CATEGORIES = ['Dydaktyka', 'Psychologia', 'Metodyka'] as const;

interface ParsedBulkRow {
  term: string;
  definition: string;
  example: string;
  category?: string;
}

export function AdminGlossaryTab({
  glossaryTerms,
  onGlossaryTermsUpdated
}: AdminGlossaryTabProps) {
  const isUsingBuiltInDefaults = glossaryTerms.length === 0;
  const effectiveTerms = useMemo(() => {
    const source = isUsingBuiltInDefaults ? DIDACTICS_GLOSSARY : glossaryTerms;
    return [...source].sort((a, b) => a.order - b.order || a.term.localeCompare(b.term, 'pl'));
  }, [glossaryTerms, isUsingBuiltInDefaults]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>([
      ...STANDARD_GLOSSARY_CATEGORIES,
      ...effectiveTerms.map((t) => t.category.trim()).filter(Boolean)
    ]);
    return Array.from(set);
  }, [effectiveTerms]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('__ALL__');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seedingDefaults, setSeedingDefaults] = useState(false);

  // Stan edytora pojedynczej fiszki
  const [editingTerm, setEditingTerm] = useState<GlossaryTerm | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [customCategoryMode, setCustomCategoryMode] = useState(false);
  const [savingTerm, setSavingTerm] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Stan modala hurtowego importu
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('Dydaktyka');
  const [bulkStartOrder, setBulkStartOrder] = useState<number>(1);
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkModalError, setBulkModalError] = useState<string | null>(null);

  // Stan usuwania
  const [deletingTerm, setDeletingTerm] = useState<GlossaryTerm | null>(null);
  const [processingDelete, setProcessingDelete] = useState(false);

  const filteredTerms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return effectiveTerms.filter((item) => {
      if (filterCategory !== '__ALL__' && item.category.trim() !== filterCategory) return false;
      if (!q) return true;
      return (
        item.term.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q) ||
        item.example.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.examTip ?? '').toLowerCase().includes(q)
      );
    });
  }, [effectiveTerms, filterCategory, searchQuery]);

  const bulkParseResult = useMemo(() => {
    const lines = bulkRawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const validRows: ParsedBulkRow[] = [];
    const invalidLines: { lineNumber: number; raw: string; reason: string }[] = [];

    lines.forEach((raw, idx) => {
      const parts = raw.split('|').map((p) => p.trim());
      if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
        invalidLines.push({
          lineNumber: idx + 1,
          raw,
          reason: 'Wymagany format: Pojęcie | Definicja | Przykład'
        });
        return;
      }
      validRows.push({
        term: parts[0],
        definition: parts[1],
        example: parts[2],
        category: parts[3] ? parts[3] : undefined
      });
    });

    return { validRows, invalidLines };
  }, [bulkRawText]);

  async function syncLocalAndNotify(nextList: GlossaryTerm[], nextVersion: number) {
    const sorted = [...nextList].sort(
      (a, b) => a.order - b.order || a.term.localeCompare(b.term, 'pl')
    );
    await saveGlossaryTermsToCache(sorted);
    setLocalDbVersion(nextVersion);
    setLocalGlossaryTermsDbVersion(nextVersion);
    onGlossaryTermsUpdated(sorted, nextVersion);
  }

  async function handleSeedDefaultsNow() {
    setSeedingDefaults(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const nextVersion = await batchImportGlossaryTerms(DIDACTICS_GLOSSARY);
      await syncLocalAndNotify(DIDACTICS_GLOSSARY, nextVersion);
      setStatusMessage(
        `Załadowano ${DIDACTICS_GLOSSARY.length} domyślnych pojęć do kolekcji glossaryTerms w Firestore (wersja bazy v${nextVersion}).`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Nie udało się zapisać domyślnych pojęć do bazy.'
      );
    } finally {
      setSeedingDefaults(false);
    }
  }

  function openNewTermModal() {
    const maxOrder = effectiveTerms.reduce((max, t) => Math.max(max, t.order), 0);
    const defaultCat = filterCategory !== '__ALL__' ? filterCategory : 'Dydaktyka';
    setIsCreatingNew(true);
    setCustomCategoryMode(!availableCategories.includes(defaultCat));
    setEditorError(null);
    setEditingTerm({
      id: generateGlossaryTermId(0),
      category: defaultCat,
      term: '',
      definition: '',
      example: '',
      examTip: '',
      order: maxOrder + 1
    });
  }

  function openEditTermModal(term: GlossaryTerm) {
    setIsCreatingNew(false);
    setCustomCategoryMode(!availableCategories.includes(term.category.trim()));
    setEditorError(null);
    setEditingTerm({
      ...term,
      examTip: term.examTip ?? ''
    });
  }

  function openBulkModal() {
    const maxOrder = effectiveTerms.reduce((max, t) => Math.max(max, t.order), 0);
    setBulkCategory(filterCategory !== '__ALL__' ? filterCategory : 'Dydaktyka');
    setBulkStartOrder(maxOrder + 1);
    setBulkRawText('');
    setBulkModalError(null);
    setBulkModalOpen(true);
  }

  async function handleSaveTerm(e: FormEvent) {
    e.preventDefault();
    if (!editingTerm) return;
    if (!editingTerm.category.trim()) {
      setEditorError('Wybierz lub wpisz dział pojęcia (np. Dydaktyka, Psychologia, Metodyka).');
      return;
    }
    if (!editingTerm.term.trim()) {
      setEditorError('Wpisz nazwę pojęcia (hasła).');
      return;
    }
    if (!editingTerm.definition.trim()) {
      setEditorError('Wpisz definicję egzaminacyjną pojęcia.');
      return;
    }

    setSavingTerm(true);
    setEditorError(null);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const cleanedTip = editingTerm.examTip?.trim();
      const cleaned: GlossaryTerm = {
        ...editingTerm,
        category: editingTerm.category.trim().slice(0, 120),
        term: editingTerm.term.trim().slice(0, 250),
        definition: editingTerm.definition.trim().slice(0, 5000),
        example: editingTerm.example.trim().slice(0, 5000),
        order: Number.isFinite(Number(editingTerm.order))
          ? Math.max(0, Math.min(10000, Math.round(Number(editingTerm.order))))
          : 1,
        ...(cleanedTip ? { examTip: cleanedTip.slice(0, 2000) } : { examTip: undefined })
      };

      let nextTerms: GlossaryTerm[];
      let nextVersion: number;

      if (isUsingBuiltInDefaults) {
        nextTerms = isCreatingNew
          ? [...DIDACTICS_GLOSSARY, cleaned]
          : DIDACTICS_GLOSSARY.map((t) => (t.id === cleaned.id ? cleaned : t));
        nextVersion = await batchImportGlossaryTerms(nextTerms);
      } else {
        nextVersion = await saveAdminGlossaryTerm(cleaned, isCreatingNew);
        nextTerms = isCreatingNew
          ? [...glossaryTerms, cleaned]
          : glossaryTerms.map((t) => (t.id === cleaned.id ? cleaned : t));
      }

      await syncLocalAndNotify(nextTerms, nextVersion);
      setStatusMessage(
        isCreatingNew
          ? `Dodano fiszkę „${cleaned.term}” (wersja bazy v${nextVersion}).`
          : `Zaktualizowano fiszkę „${cleaned.term}” (wersja bazy v${nextVersion}).`
      );
      setEditingTerm(null);
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Nie udało się zapisać fiszki.');
    } finally {
      setSavingTerm(false);
    }
  }

  async function handleCommitBulkImport(e: FormEvent) {
    e.preventDefault();
    if (bulkParseResult.validRows.length === 0) {
      setBulkModalError(
        'Wklej przynajmniej jedną poprawną linię w formacie: Pojęcie | Definicja | Przykład.'
      );
      return;
    }

    const fallbackCat = bulkCategory.trim() || 'Dydaktyka';
    const startOrderNum = Number.isFinite(Number(bulkStartOrder))
      ? Math.max(0, Math.round(Number(bulkStartOrder)))
      : 1;

    setBulkSaving(true);
    setBulkModalError(null);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const newItems: GlossaryTerm[] = bulkParseResult.validRows.map((row, idx) => ({
        id: generateGlossaryTermId(idx),
        category: (row.category || fallbackCat).slice(0, 120),
        term: row.term.slice(0, 250),
        definition: row.definition.slice(0, 5000),
        example: row.example.slice(0, 5000),
        order: startOrderNum + idx
      }));

      const itemsToWrite = isUsingBuiltInDefaults
        ? [...DIDACTICS_GLOSSARY, ...newItems]
        : newItems;
      const nextVersion = await batchImportGlossaryTerms(itemsToWrite);
      const nextAll = isUsingBuiltInDefaults
        ? [...DIDACTICS_GLOSSARY, ...newItems]
        : [...glossaryTerms, ...newItems];

      await syncLocalAndNotify(nextAll, nextVersion);
      setStatusMessage(
        `Dodano hurtowo ${newItems.length} fiszek do słownika w Firestore (wersja bazy v${nextVersion}).`
      );
      setBulkModalOpen(false);
    } catch (err) {
      setBulkModalError(
        err instanceof Error ? err.message : 'Nie udało się zaimportować fiszek.'
      );
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTerm) return;
    setProcessingDelete(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      let nextTerms: GlossaryTerm[];
      let nextVersion: number;

      if (isUsingBuiltInDefaults) {
        nextTerms = DIDACTICS_GLOSSARY.filter((t) => t.id !== deletingTerm.id);
        nextVersion =
          nextTerms.length > 0
            ? await batchImportGlossaryTerms(nextTerms)
            : await deleteAdminGlossaryTerm(deletingTerm.id);
      } else {
        nextVersion = await deleteAdminGlossaryTerm(deletingTerm.id);
        nextTerms = glossaryTerms.filter((t) => t.id !== deletingTerm.id);
      }

      await syncLocalAndNotify(nextTerms, nextVersion);
      setStatusMessage(
        `Usunięto fiszkę „${deletingTerm.term}” i podbito wersję bazy do v${nextVersion}.`
      );
      setDeletingTerm(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Nie udało się usunąć fiszki.');
    } finally {
      setProcessingDelete(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* Baner informacyjny gdy kolekcja glossaryTerms w Firestore jest jeszcze pusta */}
      {isUsingBuiltInDefaults && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50/70 p-5 sm:flex-row sm:items-center dark:border-blue-900/60 dark:bg-blue-950/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
              <Database className="h-4 w-4" aria-hidden="true" />
              <span>Wbudowany słownik domyślny ({DIDACTICS_GLOSSARY.length} pojęć)</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              Kolekcja <code className="font-mono">glossaryTerms</code> w Firestore jest jeszcze pusta — kursanci widzą {DIDACTICS_GLOSSARY.length} wbudowanych pojęć z dydaktyki, metodyki i psychologii. Możesz zapisać je do bazy jednym kliknięciem albo od razu dodać/edytować dowolną fiszkę.
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
            <span>Załaduj {DIDACTICS_GLOSSARY.length} domyślnych pojęć do bazy</span>
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
              placeholder="Szukaj pojęcia, definicji, przykładu lub wskazówki..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <select
            aria-label="Filtruj fiszki po dziale"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="__ALL__">Wszystkie działy ({effectiveTerms.length})</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({effectiveTerms.filter((t) => t.category.trim() === cat).length})
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
            <span>Import hurtowy</span>
          </button>

          <button
            type="button"
            onClick={openNewTermModal}
            className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Dodaj fiszkę</span>
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

      {/* Lista fiszek */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
          <span>
            Widoczne fiszki:{' '}
            <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
              {filteredTerms.length}
            </strong>{' '}
            z {effectiveTerms.length}
          </span>
          <span className="font-mono tabular-nums">
            Dydaktyka: {effectiveTerms.filter((t) => t.category === 'Dydaktyka').length} · Psychologia:{' '}
            {effectiveTerms.filter((t) => t.category === 'Psychologia').length} · Metodyka:{' '}
            {effectiveTerms.filter((t) => t.category === 'Metodyka').length}
          </span>
        </div>

        {filteredTerms.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            <BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-400" aria-hidden="true" />
            <p>Brak fiszek spełniających wybrane kryteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredTerms.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-start sm:px-5"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-bold text-slate-700 tabular-nums dark:text-slate-300">
                      #{String(item.order).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      {item.category}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-900 dark:text-white">{item.term}</p>

                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {item.definition}
                  </p>

                  {item.example.trim().length > 0 && (
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      <strong className="text-slate-800 dark:text-slate-200">Przykład:</strong>{' '}
                      {item.example}
                    </p>
                  )}

                  {item.examTip && item.examTip.trim().length > 0 && (
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      <strong>Wskazówka:</strong> {item.examTip}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditTermModal(item)}
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edytuj</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingTerm(item)}
                    aria-label={`Usuń fiszkę: ${item.term}`}
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Usuń</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal dodawania / edycji pojedynczej fiszki */}
      {editingTerm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="glossary-editor-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={handleSaveTerm}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2
                id="glossary-editor-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                {isCreatingNew ? 'Nowa fiszka słownikowa' : 'Edycja fiszki słownikowej'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingTerm(null)}
                aria-label="Zamknij edytor fiszki"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="glossary-category-select"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Dział
                  </label>
                  {!customCategoryMode ? (
                    <select
                      id="glossary-category-select"
                      value={
                        availableCategories.includes(editingTerm.category)
                          ? editingTerm.category
                          : '__CUSTOM__'
                      }
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setCustomCategoryMode(true);
                          setEditingTerm({ ...editingTerm, category: '' });
                        } else {
                          setEditingTerm({ ...editingTerm, category: e.target.value });
                        }
                      }}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__CUSTOM__">Inny dział (wpisz własny)...</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        id="glossary-category-select"
                        type="text"
                        value={editingTerm.category}
                        onChange={(e) =>
                          setEditingTerm({ ...editingTerm, category: e.target.value })
                        }
                        placeholder="np. Prawo lub Pedagogika"
                        className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCustomCategoryMode(false);
                          setEditingTerm({ ...editingTerm, category: 'Dydaktyka' });
                        }}
                        className="cursor-pointer rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Lista
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="glossary-order"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Kolejność
                  </label>
                  <input
                    id="glossary-order"
                    type="number"
                    min={0}
                    max={10000}
                    value={editingTerm.order}
                    onChange={(e) =>
                      setEditingTerm({
                        ...editingTerm,
                        order: Number(e.target.value)
                      })
                    }
                    className="font-mono h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="glossary-term"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Pojęcie (przód fiszki)
                </label>
                <input
                  id="glossary-term"
                  type="text"
                  value={editingTerm.term}
                  onChange={(e) => setEditingTerm({ ...editingTerm, term: e.target.value })}
                  placeholder="np. Transfer pozytywny"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="glossary-definition"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Prosta definicja egzaminacyjna
                </label>
                <textarea
                  id="glossary-definition"
                  rows={3}
                  value={editingTerm.definition}
                  onChange={(e) =>
                    setEditingTerm({ ...editingTerm, definition: e.target.value })
                  }
                  placeholder="Zwięzła i zrozumiała definicja pojęcia..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="glossary-example"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Praktyczny przykład z nauki jazdy
                </label>
                <textarea
                  id="glossary-example"
                  rows={3}
                  value={editingTerm.example}
                  onChange={(e) => setEditingTerm({ ...editingTerm, example: e.target.value })}
                  placeholder="np. Kursant znający obsługę skrzyni biegów z kat. B szybciej opanowuje ruszanie na kat. C..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="glossary-tip"
                  className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Wskazówka na egzamin (opcjonalna)
                </label>
                <input
                  id="glossary-tip"
                  type="text"
                  value={editingTerm.examTip ?? ''}
                  onChange={(e) => setEditingTerm({ ...editingTerm, examTip: e.target.value })}
                  placeholder="np. Komisja często prosi o podanie przeciwieństwa tego pojęcia..."
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
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
                disabled={savingTerm}
                onClick={() => setEditingTerm(null)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={savingTerm}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 dark:bg-blue-600"
              >
                {savingTerm && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Zapisz fiszkę i opublikuj</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal hurtowego importu fiszek */}
      {bulkModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-glossary-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <form
            onSubmit={handleCommitBulkImport}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h2
                  id="bulk-glossary-title"
                  className="font-display text-lg font-bold text-slate-900 dark:text-white"
                >
                  Hurtowy import fiszek do słownika
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Wklej po jednej fiszce w każdej linii w formacie:{' '}
                  <code className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    Pojęcie | Definicja | Przykład
                  </code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                aria-label="Zamknij okno importu fiszek"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="bulk-glossary-category"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Domyślny dział dla wklejanych fiszek
                  </label>
                  <select
                    id="bulk-glossary-category"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="bulk-glossary-start-order"
                    className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Numer początkowy
                  </label>
                  <input
                    id="bulk-glossary-start-order"
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
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="bulk-glossary-textarea"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Lista fiszek (opcjonalnie możesz dopisać 4. kolumnę: | Dział)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setBulkRawText(
                        'Apercpecja | Świadome postrzeganie oparte na wcześniejszym doświadczeniu | Doświadczony kierowca szybciej zauważa ukryty znak A-7 za drzewem niż osoba początkująca\nMotywacja wewnętrzna | Chęć nauki wynikająca z osobistego celu, a nie przymusu | Kursant dopytuje o jazdę w deszczu, bo chce czuć się pewnie po zdaniu egzaminu'
                      )
                    }
                    className="cursor-pointer text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    Wstaw przykład
                  </button>
                </div>

                <textarea
                  id="bulk-glossary-textarea"
                  rows={8}
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  placeholder="Pojęcie | Definicja egzaminacyjna | Praktyczny przykład z nauki jazdy"
                  className="font-mono w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-slate-600 tabular-nums dark:text-slate-400">
                    Poprawnych linii: {bulkParseResult.validRows.length}
                  </span>
                  {bulkParseResult.invalidLines.length > 0 && (
                    <span className="font-mono text-amber-700 tabular-nums dark:text-amber-300">
                      Pominiętych błędnych linii: {bulkParseResult.invalidLines.length} (wiersz{' '}
                      {bulkParseResult.invalidLines.map((l) => l.lineNumber).join(', ')})
                    </span>
                  )}
                </div>
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
                disabled={bulkSaving || bulkParseResult.validRows.length === 0}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 dark:bg-blue-600"
              >
                {bulkSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Dodaj {bulkParseResult.validRows.length} fiszek do Firestore</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal potwierdzenia usunięcia */}
      {deletingTerm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-glossary-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2
              id="delete-glossary-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              Usuń fiszkę słownikową
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Czy na pewno chcesz trwale usunąć pojęcie „{deletingTerm.term}” ze słownika?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={processingDelete}
                onClick={() => setDeletingTerm(null)}
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
